import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
from company_recycle import archive_project


class RecycleTests(unittest.TestCase):
    def test_verified_archive_retains_original_bytes_and_other_projects(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            work, recycle = root / 'work', root / 'recycle'
            work.mkdir(); recycle.mkdir()
            (recycle / '.fg-recycle-ready').write_text('FG actor recycle v1\n')
            project, other = work / 'demo', work / 'other'
            project.mkdir(); other.mkdir()
            (project / 'video.mp4').write_bytes(b'actual media fixture')
            destination = archive_project(project, work, recycle)
            self.assertFalse(project.exists())
            self.assertEqual((destination / 'video.mp4').read_bytes(), b'actual media fixture')
            self.assertTrue(other.exists())

    def test_missing_mount_or_failed_copy_keeps_project(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            project = root / 'demo'; project.mkdir()
            with self.assertRaises(RuntimeError):
                archive_project(project, root, root / 'missing')
            self.assertTrue(project.exists())
            recycle = root / 'recycle'; recycle.mkdir()
            (recycle / '.fg-recycle-ready').write_text('FG actor recycle v1\n')
            with patch('company_recycle.shutil.copytree', side_effect=PermissionError):
                with self.assertRaises(PermissionError):
                    archive_project(project, root, recycle)
            self.assertTrue(project.exists())

    def test_foreign_project_is_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            with self.assertRaises(ValueError):
                archive_project(root, root / 'work', root / 'recycle')


if __name__ == '__main__':
    unittest.main()
