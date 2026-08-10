"""AWS SNS SMS provider (boto3)."""

import logging

from ..base import SmsProvider, _env

log = logging.getLogger("notifications.aws_sns")


class AwsSnsSmsProvider(SmsProvider):
    name = "aws_sns"

    def is_configured(self) -> bool:
        return bool(
            _env("AWS_ACCESS_KEY_ID")
            and _env("AWS_SECRET_ACCESS_KEY")
            and _env("AWS_REGION")
        )

    def send(self, to_mobile: str, message: str) -> bool:
        try:
            import boto3
        except ImportError:
            log.error("boto3 is not installed; cannot use AWS SNS")
            return False
        try:
            client = boto3.client(
                "sns",
                region_name=_env("AWS_REGION"),
                aws_access_key_id=_env("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=_env("AWS_SECRET_ACCESS_KEY"),
            )
            kwargs = {"PhoneNumber": to_mobile, "Message": message}
            sms_type = _env("AWS_SNS_SMS_TYPE", default="Transactional")
            kwargs["MessageAttributes"] = {
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String",
                    "StringValue": sms_type,
                }
            }
            client.publish(**kwargs)
            return True
        except Exception as e:
            log.error("AWS SNS send failed: %s", e)
            return False
