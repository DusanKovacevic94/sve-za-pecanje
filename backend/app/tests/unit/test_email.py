import httpx

from app.core import email as email_module
from app.core.config import settings


def test_send_email_skips_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "")

    def fail_post(*args, **kwargs):
        raise AssertionError("must not call Resend without an API key")

    monkeypatch.setattr(httpx, "post", fail_post)
    assert email_module.send_email("test@example.com", "Test", "Telo poruke") is False


def test_send_email_posts_to_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "email_from", "Sve Za Pecanje <noreply@example.rs>")
    captured = {}

    def fake_post(url, json, headers, timeout):
        captured.update({"url": url, "json": json, "headers": headers})
        return httpx.Response(200, json={"id": "email-id"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    ok = email_module.send_email("test@example.com", "Test", "Telo poruke", html="<p>Telo</p>")
    assert ok is True
    assert captured["url"] == email_module.RESEND_API_URL
    assert captured["headers"]["Authorization"] == "Bearer re_test_key"
    assert captured["json"]["from"] == "Sve Za Pecanje <noreply@example.rs>"
    assert captured["json"]["to"] == ["test@example.com"]
    assert captured["json"]["text"] == "Telo poruke"
    assert captured["json"]["html"] == "<p>Telo</p>"


def test_send_email_returns_false_on_api_error(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def fake_post(url, **kwargs):
        return httpx.Response(422, json={"message": "invalid"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    assert email_module.send_email("test@example.com", "Test", "Telo poruke") is False


def test_send_email_returns_false_on_network_error(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def fake_post(url, **kwargs):
        raise httpx.ConnectError("no network")

    monkeypatch.setattr(httpx, "post", fake_post)
    assert email_module.send_email("test@example.com", "Test", "Telo poruke") is False
