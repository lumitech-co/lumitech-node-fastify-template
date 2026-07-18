#!/bin/sh
set -e

awslocal s3 mb "s3://${AWS_S3_BUCKET_NAME:-local-bucket}"
