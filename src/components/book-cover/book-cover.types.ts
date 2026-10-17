export type BookCoverProps = {
  title: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  /** Defer image decode until near viewport. */
  lazy?: boolean;
};
