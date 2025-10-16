from pydantic import BaseModel, Field
from typing import Optional, Dict


class EmailConfigIn(BaseModel):
    provider: str = Field("mailjet", pattern="^(smtp|mailjet|console|disabled)$")
    from_email: Optional[str] = None

    # SMTP
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None

    # Mailjet
    mailjet_api_key: Optional[str] = None
    mailjet_api_secret: Optional[str] = None


class EmailConfigOut(BaseModel):
    provider: str
    from_email: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    # no smtp_pass in output
    has_smtp_pass: bool = False
    has_mailjet_keys: bool = False


class EmailTemplatesOut(BaseModel):
    templates: Dict[str, Dict[str, str]]  # {"comment_user":{"subject":"..","body":".."}, ...}


class EmailTemplatesIn(BaseModel):
    templates: Dict[str, Dict[str, str]]