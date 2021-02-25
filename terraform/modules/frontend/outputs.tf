output "bucket_name" {
  value       = aws_s3_bucket.frontend.bucket
  description = "Name of the bucket that was created to serve frontend files from"
}

output "bucket_metrics_filter_id" {
  value       = aws_s3_bucket_metric.frontend.name
  description = "FilterId of the filter used on the bucket metrics"
}
