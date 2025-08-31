import os
import secrets
import string
import random
import uuid

from django.db import models
from django_otp.models import Device
from django.utils import timezone
from cryptography.fernet import Fernet


class AdvancedOTPDevice(Device):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # encrypted OTP
    otp_encrypted = models.CharField(max_length=256, blank=True, null=True)

    # Timestamps
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)

    # Usage & Security
    used = models.BooleanField(default=False)
    failed_attempts = models.PositiveIntegerField(default=0)
    max_failed_attempts = models.PositiveIntegerField(default=5)  # More strict policy

    # Request Limits / Cooldowns
    last_request_time = models.DateTimeField(blank=True, null=True)
    next_allowed_request_time = models.DateTimeField(blank=True, null=True)
    cooldown_multiplier = models.FloatField(default=1.5)  # Exponential backoff factor

    # Lockout until a certain time if we exceed failed attempts
    lock_until = models.DateTimeField(blank=True, null=True)

    def _get_cipher(self):
        """
        Returns an AES cipher instance using the key stored in settings.
        """
        return Fernet(os.getenv("SECRET_KEY").encode())

    def generate_token(
        self,
        code_length=6,
        valid_for_seconds=300,
        base_cooldown=60,
        random_wait_range=(5, 150),
    ):
        """
        Generates a one-time token with:
        - **Rate limiting**
        - **Exponential cooldown** (each resend increases wait time)
        - **Randomized backoff** (prevents bots from predicting when they can request again)
        """

        now = timezone.now()

        # 0️⃣ Rate-limit check: did we ask too soon?
        if self.next_allowed_request_time and now < self.next_allowed_request_time:
            remaining = int((self.next_allowed_request_time - now).total_seconds())
            msg = f"Please wait {remaining} second(s) before retrying."
            return {
                "error": True,
                "message": msg,
                "status_code": 429,  # HTTP 429 Too Many Requests
                "retry_after": remaining,  # how long until you can try again
                "remaining": remaining,  # always in seconds
            }

        # 1️⃣ **Auto-unlock device if lock period has expired**
        if self.lock_until and now >= self.lock_until:
            self.lock_until = None  # Reset lock
            self.failed_attempts = 0  # Reset failed attempts
            self.save(update_fields=["lock_until", "failed_attempts"])

        # 2️⃣ **Check if the device is locked**
        if self.lock_until and now < self.lock_until:
            remaining_lock_time = int((self.lock_until - now).total_seconds())
            # Convert to minutes and seconds
            minutes = remaining_lock_time // 60
            seconds = remaining_lock_time % 60

            if minutes > 0:
                return {
                    "error": True,
                    "message": f"Device is temporarily locked, Try again in {minutes} Minutes",
                    "status_code": 423,  # HTTP 423 LOCKED
                }
            else:
                return {
                    "error": True,
                    "message": f"Device is temporarily locked, Try again in {seconds} seconds",
                    "status_code": 423,  # HTTP 423 LOCKED
                }

        # 3️⃣ Generate OTP
        code = "".join(secrets.choice(string.digits) for _ in range(code_length))
        cipher = self._get_cipher()
        encrypted_otp = cipher.encrypt(code.encode()).decode()

        # 4️⃣ Store OTP and timestamps
        self.otp_encrypted = encrypted_otp
        self.otp_created_at = now
        self.otp_expiry = now + timezone.timedelta(seconds=valid_for_seconds)
        self.used = False
        self.failed_attempts = 0
        self.last_request_time = now

        # Calculate cooldown & random backoff
        cooldown = base_cooldown * (2**self.failed_attempts)

        # add random offset
        offset = random.randint(*random_wait_range)
        next_time = now + timezone.timedelta(seconds=cooldown)

        self.next_allowed_request_time = next_time + timezone.timedelta(seconds=offset)
        self.save()

        return {
            "error": False,
            "message": "OTP generated successfully.",
            "otp_code": code,  # REMOVE this in production!
            "next_request_in": int(
                (self.next_allowed_request_time - now).total_seconds()
            ),
        }

    def verify_token(self, token):
        """
        Verifies the OTP:
        - Ensures the device is not locked.
        - Ensures the OTP is not expired.
        - Ensures the OTP is correct by comparing the stored hash.
        - Increments failed attempts and locks the user if necessary.
        """
        now = timezone.now()

        # 1️⃣ **Check if locked out**
        if self.lock_until and now < self.lock_until:
            remaining_lock_time_seconds = int((self.lock_until - now).total_seconds())

            # Convert to minutes and seconds
            minutes = remaining_lock_time_seconds // 60
            seconds = remaining_lock_time_seconds % 60

            # Format the message
            if minutes > 0:
                message = f"Too many failed attempts. Try again in {minutes} minutes"
            else:
                message = f"Too many failed attempts. Try again in {seconds} seconds"

            return {
                "error": True,
                "message": message,
                "retry_after": remaining_lock_time_seconds,
            }

        # 2️⃣ **Ensure an OTP was generated**
        if not self.otp_encrypted:
            return {"error": True, "message": "Invalid OTP"}

        # 3️⃣ **Check if OTP is expired**
        if self.otp_expiry and now > self.otp_expiry:
            return {"error": True, "message": "This OTP has expired"}

        # 4️⃣ **Check if OTP is already used**
        if self.used:
            return {"error": True, "message": "This OTP has already been used"}

        # 5️⃣ **Verify OTP by checking the hash**
        try:
            cipher = self._get_cipher()
            decrypted_otp = cipher.decrypt(self.otp_encrypted.encode()).decode()
        except Exception as e:  # Catch decryption errors
            return {"error": True, "message": "OTP decryption failed"}
        if decrypted_otp != token:  # Compare hashes
            # Increment failed attempts
            self.failed_attempts += 1
            self.save(update_fields=["failed_attempts"])

            # 🔒 Lock the device if too many failed attempts
            if self.failed_attempts >= self.max_failed_attempts:
                min_lock_time = 5 * 60  # 5 minutes (minimum lock)
                max_lock_time = 10 * 60  # 10 minutes (maximum lock)
                random_lock_time = random.randint(
                    min_lock_time, max_lock_time
                )  # Random lock time in seconds

                self.lock_until = now + timezone.timedelta(seconds=random_lock_time)
                self.save(update_fields=["lock_until"])

                # Convert to minutes & seconds
                lock_minutes = random_lock_time // 60
                lock_seconds = random_lock_time % 60
                lock_message = f"Too many failed attempts. Try again in {lock_minutes}:{lock_seconds} minutes"

                return {
                    "error": True,
                    "message": lock_message,
                    "retry_after": random_lock_time,
                }

            return {"error": True, "message": "Invalid OTP. Please try again."}

        # ✅ **If OTP is correct, reset failures and unlock device**
        self.used = True  # Mark OTP as used
        self.failed_attempts = 0  # Reset failed attempts
        self.lock_until = None  # Remove lock
        self.otp_encrypted = None  # Clear OTP hash so it can't be reused
        self.save(
            update_fields=["used", "failed_attempts", "lock_until", "otp_encrypted"]
        )

        return {"error": False, "message": "OTP verified successfully"}
