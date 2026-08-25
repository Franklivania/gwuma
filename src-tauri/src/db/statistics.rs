use chrono::{DateTime, Datelike, Duration, NaiveTime, Utc, Weekday};
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookStatsRow {
    pub book_id: String,
    pub title: String,
    pub author: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub total_read_ms: i64,
    pub open_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RingMetric {
    pub id: String,
    pub label: String,
    pub value: f64,
    pub display: String,
    pub percent: f64,
    /// When true, UI should not render the percent column (e.g. Peak day name).
    pub hide_percent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeekDayStat {
    pub day_key: String,
    pub weekday: String,
    pub hours_ms: i64,
    pub books_opened: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCardSummary {
    pub headline_primary: String,
    pub headline_primary_label: String,
    pub headline_secondary: String,
    pub headline_secondary_label: String,
    pub rings: Vec<RingMetric>,
    pub peak_day: Option<String>,
    pub week_days: Option<Vec<WeekDayStat>>,
    /// "bars" for weekly, "rings" for monthly/quarterly/yearly time compare.
    pub chart: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatisticsSummary {
    pub period: String,
    pub library_count: i64,
    pub time: ActivityCardSummary,
    pub books: ActivityCardSummary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatsPeriod {
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
}

impl StatsPeriod {
    pub fn parse(raw: &str) -> Self {
        match raw.to_ascii_lowercase().as_str() {
            "monthly" => Self::Monthly,
            "quarterly" => Self::Quarterly,
            "yearly" => Self::Yearly,
            _ => Self::Weekly,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Weekly => "weekly",
            Self::Monthly => "monthly",
            Self::Quarterly => "quarterly",
            Self::Yearly => "yearly",
        }
    }

    pub fn day_span(self) -> i64 {
        match self {
            Self::Weekly => 7,
            Self::Monthly => 30,
            Self::Quarterly => 90,
            Self::Yearly => 365,
        }
    }
}

fn parse_rfc3339(raw: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn period_start(period: StatsPeriod, now: DateTime<Utc>) -> DateTime<Utc> {
    now - Duration::days(period.day_span() - 1)
}

fn day_key(dt: DateTime<Utc>) -> String {
    dt.format("%Y-%m-%d").to_string()
}

fn format_hours(ms: i64) -> String {
    let hours = ms as f64 / 3_600_000.0;
    if hours < 0.05 {
        format!("{:.0}m", (ms as f64 / 60_000.0).round())
    } else if hours < 10.0 {
        format!("{hours:.1}h")
    } else {
        format!("{hours:.0}h")
    }
}

fn hours_value(ms: i64) -> f64 {
    ms as f64 / 3_600_000.0
}

pub fn upsert_book_stats_snapshot(
    conn: &Connection,
    book_id: &str,
    title: &str,
    author: &str,
) -> SqlResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO book_stats (book_id, title, author, started_at, finished_at, total_read_ms, open_count, updated_at)
         VALUES (?1, ?2, ?3, NULL, NULL, 0, 0, ?4)
         ON CONFLICT(book_id) DO UPDATE SET
           title = excluded.title,
           author = excluded.author,
           updated_at = excluded.updated_at",
        params![book_id, title, author, now],
    )?;
    Ok(())
}

pub fn record_book_open(
    conn: &Connection,
    book_id: &str,
    title: &str,
    author: &str,
) -> SqlResult<String> {
    upsert_book_stats_snapshot(conn, book_id, title, author)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE book_stats SET
           open_count = open_count + 1,
           started_at = COALESCE(started_at, ?1),
           updated_at = ?1
         WHERE book_id = ?2",
        params![now, book_id],
    )?;

    // Close any dangling open sessions for this book.
    end_open_sessions_for_book(conn, book_id)?;

    let session_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO reading_sessions (id, book_id, started_at, ended_at, duration_ms)
         VALUES (?1, ?2, ?3, NULL, 0)",
        params![session_id, book_id, now],
    )?;
    Ok(session_id)
}

fn end_open_sessions_for_book(conn: &Connection, book_id: &str) -> SqlResult<()> {
    let now = Utc::now();
    let mut stmt = conn.prepare(
        "SELECT id, started_at, duration_ms FROM reading_sessions
         WHERE book_id = ?1 AND ended_at IS NULL",
    )?;
    let rows: Vec<(String, String, i64)> = stmt
        .query_map(params![book_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    for (id, started_at, prior_ms) in rows {
        let started = parse_rfc3339(&started_at).unwrap_or(now);
        let elapsed = (now - started).num_milliseconds().max(0);
        let total = prior_ms + elapsed;
        let ended = now.to_rfc3339();
        conn.execute(
            "UPDATE reading_sessions SET ended_at = ?1, duration_ms = ?2 WHERE id = ?3",
            params![ended, total, id],
        )?;
        conn.execute(
            "UPDATE book_stats SET
               total_read_ms = total_read_ms + ?1,
               updated_at = ?2
             WHERE book_id = ?3",
            params![elapsed, ended, book_id],
        )?;
    }
    Ok(())
}

pub fn ping_reading_session(conn: &Connection, session_id: &str) -> SqlResult<()> {
    let now = Utc::now();
    let row: Option<(String, String, i64)> = conn
        .query_row(
            "SELECT book_id, started_at, duration_ms FROM reading_sessions
             WHERE id = ?1 AND ended_at IS NULL",
            params![session_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;

    let Some((book_id, started_at, prior_ms)) = row else {
        return Ok(());
    };

    let started = parse_rfc3339(&started_at).unwrap_or(now);
    // Cap heartbeat window so background tabs don't inflate forever.
    let elapsed = (now - started).num_milliseconds().clamp(0, 120_000);
    let total = prior_ms.max(elapsed);
    let stamp = now.to_rfc3339();

    // Store cumulative duration while session is open (from start), without double-counting
    // into book_stats until end. Recompute delta vs last stored duration_ms.
    let delta = (total - prior_ms).max(0);
    conn.execute(
        "UPDATE reading_sessions SET duration_ms = ?1 WHERE id = ?2",
        params![total, session_id],
    )?;
    if delta > 0 {
        conn.execute(
            "UPDATE book_stats SET
               total_read_ms = total_read_ms + ?1,
               updated_at = ?2
             WHERE book_id = ?3",
            params![delta, stamp, book_id],
        )?;
        // Shift started_at forward so next ping only counts new elapsed time.
        conn.execute(
            "UPDATE reading_sessions SET started_at = ?1, duration_ms = 0 WHERE id = ?2",
            params![stamp, session_id],
        )?;
    }
    Ok(())
}

pub fn end_reading_session(conn: &Connection, session_id: &str) -> SqlResult<()> {
    let now = Utc::now();
    let row: Option<(String, String, i64)> = conn
        .query_row(
            "SELECT book_id, started_at, duration_ms FROM reading_sessions
             WHERE id = ?1 AND ended_at IS NULL",
            params![session_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;

    let Some((book_id, started_at, prior_ms)) = row else {
        return Ok(());
    };

    let started = parse_rfc3339(&started_at).unwrap_or(now);
    let elapsed = (now - started).num_milliseconds().max(0);
    let total = prior_ms + elapsed;
    let ended = now.to_rfc3339();

    conn.execute(
        "UPDATE reading_sessions SET ended_at = ?1, duration_ms = ?2 WHERE id = ?3",
        params![ended, total, session_id],
    )?;
    conn.execute(
        "UPDATE book_stats SET
           total_read_ms = total_read_ms + ?1,
           updated_at = ?2
         WHERE book_id = ?3",
        params![elapsed, ended, book_id],
    )?;
    Ok(())
}

pub fn mark_book_finished(
    conn: &Connection,
    book_id: &str,
    title: &str,
    author: &str,
) -> SqlResult<()> {
    upsert_book_stats_snapshot(conn, book_id, title, author)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE book_stats SET
           finished_at = COALESCE(finished_at, ?1),
           started_at = COALESCE(started_at, ?1),
           updated_at = ?1
         WHERE book_id = ?2",
        params![now, book_id],
    )?;
    Ok(())
}

pub fn list_book_stats(conn: &Connection, period: Option<&str>) -> SqlResult<Vec<BookStatsRow>> {
    let period = period.map(StatsPeriod::parse);
    let now = Utc::now();

    let mut stmt = conn.prepare(
        "SELECT book_id, title, author, started_at, finished_at, total_read_ms, open_count
         FROM book_stats
         ORDER BY COALESCE(finished_at, started_at, updated_at) DESC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(BookStatsRow {
            book_id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            started_at: row.get(3)?,
            finished_at: row.get(4)?,
            total_read_ms: row.get(5)?,
            open_count: row.get(6)?,
        })
    })?;

    let mut out = Vec::new();
    for row in rows {
        let entry = row?;
        if let Some(p) = period {
            let start = period_start(p, now);
            let start_s = start.to_rfc3339();
            let has_session: i64 = conn.query_row(
                "SELECT COUNT(1) FROM reading_sessions
                 WHERE book_id = ?1 AND started_at >= ?2",
                params![entry.book_id, start_s],
                |r| r.get(0),
            )?;
            let started_in = entry
                .started_at
                .as_deref()
                .and_then(parse_rfc3339)
                .map(|dt| dt >= start)
                .unwrap_or(false);
            let finished_in = entry
                .finished_at
                .as_deref()
                .and_then(parse_rfc3339)
                .map(|dt| dt >= start)
                .unwrap_or(false);
            if has_session == 0 && !started_in && !finished_in {
                continue;
            }
        }
        out.push(entry);
    }
    Ok(out)
}

fn session_ms_in_range(
    conn: &Connection,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> SqlResult<Vec<(String, i64)>> {
    let start_s = start.to_rfc3339();
    let mut stmt = conn.prepare(
        "SELECT started_at, ended_at, duration_ms FROM reading_sessions
         WHERE started_at >= ?1 OR (ended_at IS NOT NULL AND ended_at >= ?1)
            OR ended_at IS NULL",
    )?;

    let rows = stmt.query_map(params![start_s], |row| {
        let started_at: String = row.get(0)?;
        let ended_at: Option<String> = row.get(1)?;
        let duration_ms: i64 = row.get(2)?;
        Ok((started_at, ended_at, duration_ms))
    })?;

    let now = Utc::now();
    let mut by_day: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for row in rows {
        let (started_at, ended_at, duration_ms) = row?;
        let started = parse_rfc3339(&started_at).unwrap_or(now);
        let ended = ended_at.as_deref().and_then(parse_rfc3339).unwrap_or(now);

        if ended < start || started > end {
            continue;
        }

        let effective_start = if started < start { start } else { started };
        if effective_start > end {
            continue;
        }
        let key = day_key(effective_start);
        let ms = if ended_at.is_some() {
            duration_ms
        } else {
            (ended - started).num_milliseconds().max(0)
        };
        *by_day.entry(key).or_insert(0) += ms.max(0);
    }

    Ok(by_day.into_iter().collect())
}

fn books_opened_by_day(
    conn: &Connection,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> SqlResult<std::collections::HashMap<String, i64>> {
    let start_s = start.to_rfc3339();
    let end_s = end.to_rfc3339();
    let mut stmt = conn.prepare(
        "SELECT started_at, book_id FROM reading_sessions
         WHERE started_at >= ?1 AND started_at <= ?2",
    )?;
    let rows = stmt.query_map(params![start_s, end_s], |row| {
        let started_at: String = row.get(0)?;
        let book_id: String = row.get(1)?;
        Ok((started_at, book_id))
    })?;

    let mut by_day: std::collections::HashMap<String, std::collections::HashSet<String>> =
        std::collections::HashMap::new();
    for row in rows {
        let (started_at, book_id) = row?;
        if let Some(dt) = parse_rfc3339(&started_at) {
            by_day.entry(day_key(dt)).or_default().insert(book_id);
        }
    }

    Ok(by_day
        .into_iter()
        .map(|(k, set)| (k, set.len() as i64))
        .collect())
}

fn ring_percent(value: f64, max: f64) -> f64 {
    if max <= 0.0 {
        return 0.0;
    }
    ((value / max) * 100.0).clamp(0.0, 100.0)
}

/// Compare current vs previous: if previous is 0, 100% when current > 0 else 0.
fn compare_percent(current: f64, previous: f64) -> f64 {
    if previous <= 0.0 {
        return if current > 0.0 { 100.0 } else { 0.0 };
    }
    ((current / previous) * 100.0).clamp(0.0, 100.0)
}

fn start_of_utc_day(dt: DateTime<Utc>) -> DateTime<Utc> {
    dt.date_naive()
        .and_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
        .and_utc()
}

fn end_of_utc_day(dt: DateTime<Utc>) -> DateTime<Utc> {
    start_of_utc_day(dt) + Duration::days(1) - Duration::milliseconds(1)
}

/// Sunday-first calendar week containing `now`.
fn sunday_week_bounds(now: DateTime<Utc>) -> (DateTime<Utc>, DateTime<Utc>) {
    let today = start_of_utc_day(now);
    let days_from_sun = today.weekday().num_days_from_sunday() as i64;
    let week_start = today - Duration::days(days_from_sun);
    let week_end = end_of_utc_day(week_start + Duration::days(6));
    (week_start, week_end)
}

fn weekday_short(dt: DateTime<Utc>) -> &'static str {
    match dt.weekday() {
        Weekday::Sun => "Sun",
        Weekday::Mon => "Mon",
        Weekday::Tue => "Tue",
        Weekday::Wed => "Wed",
        Weekday::Thu => "Thu",
        Weekday::Fri => "Fri",
        Weekday::Sat => "Sat",
    }
}

fn peak_day_name(day_ms: &[(String, i64)]) -> Option<String> {
    let (key, ms) = day_ms.iter().max_by_key(|(_, ms)| *ms)?;
    if *ms <= 0 {
        return None;
    }
    let date = chrono::NaiveDate::parse_from_str(key, "%Y-%m-%d").ok()?;
    let dt = date.and_time(NaiveTime::from_hms_opt(12, 0, 0)?).and_utc();
    Some(weekday_short(dt).to_string())
}

fn period_aggregates(day_ms: &[(String, i64)], day_span: f64) -> (i64, i64, i64) {
    let total_ms: i64 = day_ms.iter().map(|(_, ms)| *ms).sum();
    let peak_ms = day_ms.iter().map(|(_, ms)| *ms).max().unwrap_or(0);
    let daily_avg_ms = if day_span > 0.0 {
        (total_ms as f64 / day_span) as i64
    } else {
        0
    };
    (total_ms, peak_ms, daily_avg_ms)
}

fn build_week_days(
    week_start: DateTime<Utc>,
    hours_by_day: &std::collections::HashMap<String, i64>,
    books_by_day: &std::collections::HashMap<String, i64>,
) -> Vec<WeekDayStat> {
    (0..7)
        .map(|offset| {
            let day = week_start + Duration::days(offset);
            let key = day_key(day);
            WeekDayStat {
                day_key: key.clone(),
                weekday: weekday_short(day).to_string(),
                hours_ms: *hours_by_day.get(&key).unwrap_or(&0),
                books_opened: *books_by_day.get(&key).unwrap_or(&0),
            }
        })
        .collect()
}

pub fn get_statistics_summary(conn: &Connection, period_raw: &str) -> SqlResult<StatisticsSummary> {
    let period = StatsPeriod::parse(period_raw);
    let now = Utc::now();
    let start = period_start(period, now);
    let end = end_of_utc_day(now);
    let days = period.day_span() as f64;

    let day_ms = session_ms_in_range(conn, start, end)?;
    let (total_ms, peak_ms, daily_avg_ms) = period_aggregates(&day_ms, days);
    let peak_day = peak_day_name(&day_ms);

    let library_count: i64 =
        conn.query_row("SELECT COUNT(1) FROM books WHERE available = 1", [], |r| {
            r.get(0)
        })?;

    let start_s = start.to_rfc3339();
    let opened: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT book_id) FROM reading_sessions WHERE started_at >= ?1",
        params![start_s],
        |r| r.get(0),
    )?;
    let favourited: i64 = conn.query_row(
        "SELECT COUNT(1) FROM books WHERE favourite = 1 AND available = 1",
        [],
        |r| r.get(0),
    )?;
    let completed: i64 = conn.query_row(
        "SELECT COUNT(1) FROM book_stats
         WHERE finished_at IS NOT NULL AND finished_at >= ?1",
        params![start_s],
        |r| r.get(0),
    )?;

    let lib = library_count.max(0) as f64;
    let books_rings = vec![
        RingMetric {
            id: "opened".into(),
            label: "Opened".into(),
            value: opened as f64,
            display: format!("{opened} / {library_count}"),
            percent: ring_percent(opened as f64, lib),
            hide_percent: false,
        },
        RingMetric {
            id: "favourited".into(),
            label: "Favourited".into(),
            value: favourited as f64,
            display: format!("{favourited} / {library_count}"),
            percent: ring_percent(favourited as f64, lib),
            hide_percent: false,
        },
        RingMetric {
            id: "completed".into(),
            label: "Completed".into(),
            value: completed as f64,
            display: format!("{completed} / {library_count}"),
            percent: ring_percent(completed as f64, lib),
            hide_percent: false,
        },
    ];

    let books_card = ActivityCardSummary {
        headline_primary: completed.to_string(),
        headline_primary_label: "Completed".into(),
        headline_secondary: opened.to_string(),
        headline_secondary_label: "Opened".into(),
        rings: books_rings.clone(),
        peak_day: None,
        week_days: None,
        chart: if period == StatsPeriod::Weekly {
            "bars".into()
        } else {
            "rings".into()
        },
    };

    if period == StatsPeriod::Weekly {
        let (week_start, week_end) = sunday_week_bounds(now);
        let week_hours = session_ms_in_range(conn, week_start, week_end)?;
        let hours_map: std::collections::HashMap<String, i64> =
            week_hours.iter().cloned().collect();
        let books_map = books_opened_by_day(conn, week_start, week_end)?;
        let week_days = build_week_days(week_start, &hours_map, &books_map);
        let week_total: i64 = week_days.iter().map(|d| d.hours_ms).sum();
        let week_avg = week_total / 7;
        let week_peak_day = week_days
            .iter()
            .max_by_key(|d| d.hours_ms)
            .filter(|d| d.hours_ms > 0)
            .map(|d| d.weekday.clone());

        let time_rings = vec![
            RingMetric {
                id: "daily_avg".into(),
                label: "Daily average".into(),
                value: hours_value(week_avg),
                display: format_hours(week_avg),
                percent: 0.0,
                hide_percent: true,
            },
            RingMetric {
                id: "total".into(),
                label: "Total hours".into(),
                value: hours_value(week_total),
                display: format_hours(week_total),
                percent: 0.0,
                hide_percent: true,
            },
            RingMetric {
                id: "peak_day".into(),
                label: "Peak day".into(),
                value: 0.0,
                display: week_peak_day.clone().unwrap_or_else(|| "—".into()),
                percent: 0.0,
                hide_percent: true,
            },
        ];

        let mut books_week = books_card;
        books_week.week_days = Some(week_days.clone());
        books_week.chart = "bars".into();
        books_week.peak_day = week_days
            .iter()
            .max_by_key(|d| d.books_opened)
            .filter(|d| d.books_opened > 0)
            .map(|d| d.weekday.clone());

        return Ok(StatisticsSummary {
            period: period.as_str().to_string(),
            library_count,
            time: ActivityCardSummary {
                headline_primary: format_hours(week_total),
                headline_primary_label: "Hours read".into(),
                headline_secondary: format_hours(week_avg),
                headline_secondary_label: "Daily avg".into(),
                rings: time_rings,
                peak_day: week_peak_day,
                week_days: Some(week_days),
                chart: "bars".into(),
            },
            books: books_week,
        });
    }

    // Non-weekly: Time radial = current vs previous period of same length.
    let prev_end = start - Duration::milliseconds(1);
    let prev_start = period_start(period, prev_end);
    let prev_day_ms = session_ms_in_range(conn, prev_start, prev_end)?;
    let (prev_total, prev_peak, prev_avg) = period_aggregates(&prev_day_ms, days);

    let time_rings = vec![
        RingMetric {
            id: "daily_avg".into(),
            label: "Daily average".into(),
            value: hours_value(daily_avg_ms),
            display: format!(
                "{} / {}",
                format_hours(daily_avg_ms),
                format_hours(prev_avg)
            ),
            percent: compare_percent(daily_avg_ms as f64, prev_avg as f64),
            hide_percent: false,
        },
        RingMetric {
            id: "total".into(),
            label: "Total hours".into(),
            value: hours_value(total_ms),
            display: format!("{} / {}", format_hours(total_ms), format_hours(prev_total)),
            percent: compare_percent(total_ms as f64, prev_total as f64),
            hide_percent: false,
        },
        RingMetric {
            id: "peak_day".into(),
            label: "Peak day".into(),
            value: hours_value(peak_ms),
            display: peak_day.clone().unwrap_or_else(|| "—".into()),
            percent: compare_percent(peak_ms as f64, prev_peak as f64),
            hide_percent: true,
        },
    ];

    Ok(StatisticsSummary {
        period: period.as_str().to_string(),
        library_count,
        time: ActivityCardSummary {
            headline_primary: format_hours(total_ms),
            headline_primary_label: "Hours read".into(),
            headline_secondary: format_hours(daily_avg_ms),
            headline_secondary_label: "Daily avg".into(),
            rings: time_rings,
            peak_day,
            week_days: None,
            chart: "rings".into(),
        },
        books: books_card,
    })
}

/// Clear and replace text chunks for a book (used by PDF frontend indexer and Rust extractors).
pub fn replace_book_text_chunks(
    conn: &Connection,
    book_id: &str,
    chunks: &[(i64, &str)],
) -> SqlResult<()> {
    conn.execute(
        "DELETE FROM book_text_chunks WHERE book_id = ?1",
        params![book_id],
    )?;
    let now = Utc::now().to_rfc3339();
    for (index, text) in chunks {
        if text.trim().is_empty() {
            continue;
        }
        conn.execute(
            "INSERT INTO book_text_chunks (book_id, chunk_index, text, indexed_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![book_id, index, text, now],
        )?;
    }
    conn.execute(
        "INSERT INTO book_index_meta (book_id, indexed_at, chunk_count)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(book_id) DO UPDATE SET
           indexed_at = excluded.indexed_at,
           chunk_count = excluded.chunk_count",
        params![book_id, now, chunks.len() as i64],
    )?;
    Ok(())
}

pub fn is_book_indexed(conn: &Connection, book_id: &str) -> SqlResult<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM book_index_meta WHERE book_id = ?1 AND chunk_count > 0",
        params![book_id],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub book_id: String,
    pub title: String,
    pub author: String,
    pub kind: String,
    pub snippet: Option<String>,
    pub cover_url: Option<String>,
    pub format: Option<String>,
    pub path: Option<String>,
}

pub fn search_library(conn: &Connection, query: &str, limit: i64) -> SqlResult<Vec<SearchHit>> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let like = format!("%{}%", q.to_lowercase());
    let mut hits = Vec::new();

    // Titles
    {
        let mut stmt = conn.prepare(
            "SELECT id, title, author, cover, format, path FROM books
             WHERE available = 1 AND lower(title) LIKE ?1
             ORDER BY title COLLATE NOCASE ASC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![like, limit], |row| {
            Ok(SearchHit {
                book_id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                kind: "title".into(),
                snippet: None,
                cover_url: row.get(3)?,
                format: row.get(4)?,
                path: row.get(5)?,
            })
        })?;
        for row in rows {
            hits.push(row?);
        }
    }

    // Authors
    {
        let mut stmt = conn.prepare(
            "SELECT id, title, author, cover, format, path FROM books
             WHERE available = 1 AND lower(author) LIKE ?1
             ORDER BY author COLLATE NOCASE ASC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![like, limit], |row| {
            Ok(SearchHit {
                book_id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                kind: "author".into(),
                snippet: None,
                cover_url: row.get(3)?,
                format: row.get(4)?,
                path: row.get(5)?,
            })
        })?;
        for row in rows {
            let hit = row?;
            if !hits
                .iter()
                .any(|h| h.book_id == hit.book_id && h.kind == "title")
            {
                hits.push(hit);
            }
        }
    }

    // In-book phrases
    {
        let mut stmt = conn.prepare(
            "SELECT c.book_id, b.title, b.author, c.text, b.cover, b.format, b.path
             FROM book_text_chunks c
             JOIN books b ON b.id = c.book_id
             WHERE b.available = 1
               AND lower(c.text) LIKE ?1
               AND c.chunk_index = (
                 SELECT MIN(c2.chunk_index) FROM book_text_chunks c2
                 WHERE c2.book_id = c.book_id AND lower(c2.text) LIKE ?1
               )
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![like, limit], |row| {
            let text: String = row.get(3)?;
            let snippet = make_snippet(&text, q);
            Ok(SearchHit {
                book_id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                kind: "phrase".into(),
                snippet: Some(snippet),
                cover_url: row.get(4)?,
                format: row.get(5)?,
                path: row.get(6)?,
            })
        })?;
        for row in rows {
            hits.push(row?);
        }
    }

    Ok(hits)
}

fn make_snippet(text: &str, query: &str) -> String {
    let lower = text.to_lowercase();
    let q = query.to_lowercase();
    let idx = lower.find(&q).unwrap_or(0);
    let start = idx.saturating_sub(40);
    let end = (idx + q.len() + 40).min(text.len());
    // Byte-safe-ish slice: clamp to char boundaries
    let start = text
        .char_indices()
        .map(|(i, _)| i)
        .take_while(|i| *i <= start)
        .last()
        .unwrap_or(0);
    let end = text
        .char_indices()
        .map(|(i, _)| i)
        .find(|i| *i >= end)
        .unwrap_or(text.len());
    let mut snippet = String::new();
    if start > 0 {
        snippet.push('…');
    }
    snippet.push_str(text.get(start..end).unwrap_or(text));
    if end < text.len() {
        snippet.push('…');
    }
    snippet
}
