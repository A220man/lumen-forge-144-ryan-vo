import pytest

from app.services.source import is_private_ip


class TestIsPrivateIp:
    """Non-public address space must be treated as unsafe for SSRF protection."""

    @pytest.mark.parametrize(
        "ip",
        [
            "10.0.0.1",
            "172.16.0.1",
            "192.168.1.1",
            "127.0.0.1",
            "169.254.169.254",
            "::1",
            "fc00::1",
            "fe80::1",
        ],
    )
    def test_private_and_loopback_addresses_are_unsafe(self, ip: str):
        assert is_private_ip(ip) is True

    @pytest.mark.parametrize(
        "ip",
        [
            "0.0.0.0",
            "0.1.2.3",
            "100.64.0.1",
            "100.127.255.254",
            "192.0.0.1",
            "192.0.2.1",
            "198.18.0.1",
            "198.51.100.1",
            "203.0.113.1",
            "255.255.255.255",
            "2001:db8::1",
        ],
    )
    def test_non_public_addresses_are_unsafe(self, ip: str):
        assert is_private_ip(ip) is True

    @pytest.mark.parametrize("ip", ["8.8.8.8", "1.1.1.1", "2606:4700::1111"])
    def test_public_addresses_are_allowed(self, ip: str):
        assert is_private_ip(ip) is False

    def test_unparseable_address_fails_closed(self):
        assert is_private_ip("not-an-ip") is True
