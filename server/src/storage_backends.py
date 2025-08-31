import logging
import os
import subprocess
from io import BytesIO
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse

from django.conf import settings
from PIL import Image
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)


class CompressedMediaStorage(S3Boto3Storage):
    def __init__(self, *args, **kwargs):
        # Extract custom options
        self.url_expire = kwargs.pop("url_expire", 3600)
        self.public_endpoint = kwargs.pop("public_endpoint", None)
        super().__init__(*args, **kwargs)

    def _save(self, name, content):
        if not getattr(settings, "COMPRESS_MEDIA", False):
            return super()._save(name, content)

        ext = os.path.splitext(name)[1][1:].lower()
        compress_extensions = getattr(settings, "COMPRESS_EXTENSIONS", {})

        try:
            # Image Compression
            if ext in compress_extensions.get("images", []):
                content = self._compress_image(content, ext)

            # PDF Compression
            elif ext in compress_extensions.get("pdfs", []):
                content = self._compress_pdf(content)

            # Video Compression
            elif ext in compress_extensions.get("videos", []):
                content = self._compress_video(content, ext)

        except Exception as e:
            logger.error(f"Compression failed for {name}: {str(e)}")

        return super()._save(name, content)

    def _compress_image(self, content, ext):
        """Compress image while maintaining format"""
        quality = settings.COMPRESS_QUALITY.get("images", 85)

        try:
            img = Image.open(content)
            output = BytesIO()

            if ext in ["jpg", "jpeg"] and img.mode == "RGBA":
                img = img.convert("RGB")

            if ext in ["jpg", "jpeg"]:
                img.save(output, format="JPEG", quality=quality, optimize=True)
            elif ext == "png":
                img.save(output, format="PNG", optimize=True)
            else:
                return content

            output.seek(0)
            return output
        except Exception as e:
            logger.error(f"Image compression failed: {str(e)}")
            content.seek(0)
            return content

    def _compress_pdf(self, content):
        """Compress PDF using Ghostscript"""
        quality = settings.COMPRESS_QUALITY.get("pdfs", "screen")

        with NamedTemporaryFile(suffix=".pdf") as tmp_input:
            tmp_input.write(content.read())
            tmp_input.flush()

            with NamedTemporaryFile(suffix=".pdf") as tmp_output:
                cmd = [
                    "gs",
                    "-sDEVICE=pdfwrite",
                    f"-dPDFSETTINGS=/{quality}",
                    "-dNOPAUSE",
                    "-dQUIET",
                    "-dBATCH",
                    f"-sOutputFile={tmp_output.name}",
                    tmp_input.name,
                ]

                try:
                    subprocess.run(cmd, check=True)
                    tmp_output.seek(0)
                    return BytesIO(tmp_output.read())
                except (subprocess.CalledProcessError, FileNotFoundError) as e:
                    logger.error(f"PDF compression failed: {str(e)}")
                    content.seek(0)
                    return content

    def _compress_video(self, content, ext):
        """Compress video using FFmpeg"""
        quality = settings.COMPRESS_QUALITY.get("videos", "medium")
        crf_values = {"low": 28, "medium": 23, "high": 18}

        with NamedTemporaryFile(suffix=f".{ext}") as tmp_input:
            tmp_input.write(content.read())
            tmp_input.flush()

            with NamedTemporaryFile(suffix=".mp4") as tmp_output:
                cmd = [
                    "ffmpeg",
                    "-i",
                    tmp_input.name,
                    "-vcodec",
                    "libx264",
                    "-crf",
                    str(crf_values.get(quality, 23)),
                    "-preset",
                    "fast",
                    "-movflags",
                    "+faststart",
                    "-y",  # Overwrite output
                    tmp_output.name,
                ]

                try:
                    subprocess.run(
                        cmd, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE
                    )
                    tmp_output.seek(0)
                    return BytesIO(tmp_output.read())
                except (subprocess.CalledProcessError, FileNotFoundError) as e:
                    logger.error(f"Video compression failed: {str(e)}")
                    content.seek(0)
                    return content

    def url(self, name, parameters=None, expire=None):
        """
        Generate presigned URL with proper public endpoint
        """
        try:
            # In production, generate presigned URL directly for the public endpoint
            if (
                self.public_endpoint
                and hasattr(settings, "ENVIRONMENT")
                and settings.ENVIRONMENT == "production"
            ):
                import boto3
                from botocore.config import Config
                from urllib.parse import urlparse

                # Create a separate client for presigned URL generation using public endpoint
                parsed_public = urlparse(self.public_endpoint)
                public_endpoint = f"{parsed_public.scheme}://{parsed_public.netloc}"

                client = boto3.client(
                    "s3",
                    endpoint_url=public_endpoint,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=getattr(self, "region_name", "us-east-1"),
                    config=Config(
                        signature_version="s3v4", s3={"addressing_style": "path"}
                    ),
                )

                # Generate presigned URL for public endpoint
                presigned_url = client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": name},
                    ExpiresIn=self.url_expire if expire is None else expire,
                )

                return presigned_url
            else:
                # Development mode - use default behavior
                return super().url(
                    name,
                    parameters=parameters,
                    expire=self.url_expire if expire is None else expire,
                )

        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {name}: {str(e)}")
            # Fallback to basic URL generation
            return (
                f"{self.public_endpoint or self.endpoint_url}/{self.bucket_name}/{name}"
            )
