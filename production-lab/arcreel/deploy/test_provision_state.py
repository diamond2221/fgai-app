import unittest
from provision_state import runtime_needs_preparation

class RuntimePreparationTests(unittest.TestCase):
    def test_first_visit_missing_and_failed_startup_are_retried(self):
        for state in (None, {}, {'State': {'Running': False}}, {'State': {'Running': True, 'Health': {'Status': 'unhealthy'}}}):
            self.assertTrue(runtime_needs_preparation(state))

    def test_booting_runtime_is_not_restarted_on_every_five_second_poll(self):
        for status in ('starting', 'healthy'):
            self.assertFalse(runtime_needs_preparation({'Image': 'current', 'State': {'Running': True, 'Health': {'Status': status}}}))

    def test_regular_upgrade_still_replaces_old_images(self):
        state = {'Image': 'old', 'State': {'Running': True, 'Health': {'Status': 'healthy'}}}
        self.assertTrue(runtime_needs_preparation(state, 'new'))
        self.assertFalse(runtime_needs_preparation(state, 'old'))

if __name__ == '__main__':
    unittest.main()
