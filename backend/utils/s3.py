import boto3
import os
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION")
)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET")
TRANSLATED_BUCKET_NAME = os.getenv("AWS_S3_TRANSLATED_BUCKET")

def s3_health_check():
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        return True
    except Exception:
        return False


def upload_file_to_s3(file_path: str, file_name: str, bucket_name: str = None) -> str:
    """
    Upload a file to S3 and return the URL
    """
    if bucket_name is None:
        bucket_name = BUCKET_NAME

    try:
        s3.upload_file(file_path, bucket_name, file_name)
        url = f"https://{bucket_name}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{file_name}"
        return url
    except Exception as e:
        raise Exception(f"Failed to upload file to S3: {str(e)}")


def upload_file_content_to_s3(file_content: bytes, file_name: str, bucket_name: str = None) -> str:
    """
    Upload file content directly to S3 and return the URL
    """
    if bucket_name is None:
        bucket_name = BUCKET_NAME

    try:
        s3.put_object(Bucket=bucket_name, Key=file_name, Body=file_content)
        url = f"https://{bucket_name}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{file_name}"
        return url
    except Exception as e:
        raise Exception(f"Failed to upload file content to S3: {str(e)}")
