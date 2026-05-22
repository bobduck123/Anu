import pytest

from scripts.verify_presence_account_integrity import (
    assert_single_app_user,
    assert_single_auth_user,
    assert_subject_rebind_available,
)


class Row:
    def __init__(self, row_id):
        self.id = row_id


def test_account_integrity_fails_loudly_for_duplicate_app_or_auth_users():
    with pytest.raises(RuntimeError, match="Multiple Presence app users"):
        assert_single_app_user("pilot@example.test", [Row(1), Row(2)])

    with pytest.raises(RuntimeError, match="Multiple Supabase auth users"):
        assert_single_auth_user("pilot@example.test", [{"id": "a"}, {"id": "b"}])


def test_account_integrity_fails_loudly_when_subject_is_bound_elsewhere():
    with pytest.raises(RuntimeError, match="already bound"):
        assert_subject_rebind_available(
            "active-supabase-subject",
            target_user_id=1,
            rows=[Row(2)],
        )
