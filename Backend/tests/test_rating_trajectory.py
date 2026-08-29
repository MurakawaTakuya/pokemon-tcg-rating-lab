import os
import unittest

os.environ.setdefault("DATABASE_URL", "mysql+pymysql://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")

from backend.kaggle_service import episode_rating_point


class EpisodeRatingPointTests(unittest.TestCase):
    def test_extracts_the_submitting_agents_rating(self):
        episode = {
            "id": "123",
            "createTime": "2026-08-30T01:00:00Z",
            "endTime": "2026-08-30T01:04:00Z",
            "agents": [
                {"submissionId": "41", "reward": 1, "initialScore": 992.2, "updatedScore": 995.3},
                {"submissionId": "99", "reward": -1, "initialScore": 901.1, "updatedScore": 898.0},
            ],
        }

        point = episode_rating_point(episode, 41)

        self.assertEqual(point["id"], "123")
        self.assertEqual(point["outcome"], "win")
        self.assertEqual(point["created_at"], "2026-08-30T01:00:00Z")
        self.assertEqual(point["ended_at"], "2026-08-30T01:04:00Z")
        self.assertAlmostEqual(point["initial_score"], 992.2)
        self.assertAlmostEqual(point["updated_score"], 995.3)
        self.assertAlmostEqual(point["rating_delta"], 3.1)

    def test_keeps_episode_when_rating_is_missing(self):
        episode = {
            "id": 124,
            "agents": [
                {"submissionId": 41, "reward": 0},
                {"submissionId": 99, "reward": 0},
            ],
        }

        point = episode_rating_point(episode, "41")

        self.assertEqual(point["id"], "124")
        self.assertEqual(point["outcome"], "draw")
        self.assertIsNone(point["initial_score"])
        self.assertIsNone(point["updated_score"])
        self.assertIsNone(point["rating_delta"])


if __name__ == "__main__":
    unittest.main()
