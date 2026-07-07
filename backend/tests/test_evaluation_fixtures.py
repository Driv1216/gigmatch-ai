import json
import tempfile
import unittest
from pathlib import Path

from app.evaluation import (
    EvaluationFixtureValidationError,
    EvaluationLabelSource,
    EvaluationQueryType,
    RelevanceLabel,
    load_seeded_evaluation_fixtures,
    validate_evaluation_fixture,
)
from app.matching import FreelancerMatchProfile, GigMatchProfile


class EvaluationFixtureTests(unittest.TestCase):
    def test_seeded_fixtures_load_successfully(self):
        fixtures = load_seeded_evaluation_fixtures()

        self.assertGreaterEqual(len(fixtures), 1)
        fixture_ids = [fixture.fixture_id for fixture in fixtures]
        self.assertEqual(len(fixture_ids), len(set(fixture_ids)))
        self.assertIn("seeded_matching_eval_001", fixture_ids)

        seeded = next(fixture for fixture in fixtures if fixture.fixture_id == "seeded_matching_eval_001")
        self.assertEqual(len(seeded.queries), 2)
        self.assertEqual(seeded.queries[0].query_type, EvaluationQueryType.FREELANCER_TO_GIGS)
        self.assertIsInstance(seeded.queries[0].query_entity, FreelancerMatchProfile)
        self.assertTrue(all(isinstance(candidate, GigMatchProfile) for candidate in seeded.queries[0].candidate_entities))
        self.assertEqual(seeded.queries[1].query_type, EvaluationQueryType.GIG_TO_FREELANCERS)
        self.assertIsInstance(seeded.queries[1].query_entity, GigMatchProfile)
        self.assertTrue(
            all(isinstance(candidate, FreelancerMatchProfile) for candidate in seeded.queries[1].candidate_entities)
        )
        self.assertEqual(seeded.queries[0].judgments[0].relevance_label, RelevanceLabel.STRONGLY_RELEVANT)
        self.assertEqual(seeded.queries[0].judgments[0].label_source, EvaluationLabelSource.SEEDED_FIXTURE)
        self.assertTrue(all(query.is_complete_judgment_set for query in seeded.queries))

    def test_valid_fixture_normalizes_entities(self):
        fixture = validate_evaluation_fixture(_valid_fixture())

        query = fixture.queries[0]
        self.assertEqual(fixture.fixture_id, "fixture-test")
        self.assertEqual(query.query_id, "query-test")
        self.assertEqual(query.query_entity.freelancer_id, "freelancer-test")
        self.assertEqual([candidate.gig_id for candidate in query.candidate_entities], ["gig-a", "gig-b"])
        self.assertEqual([judgment.relevance_label for judgment in query.judgments], [RelevanceLabel.STRONGLY_RELEVANT, RelevanceLabel.NOT_RELEVANT])

    def test_empty_fixture_id_is_rejected(self):
        fixture = _valid_fixture()
        fixture["fixture_id"] = " "

        self.assertInvalid(fixture, "fixture_id")

    def test_empty_queries_are_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"] = []

        self.assertInvalid(fixture, "at least one query")

    def test_duplicate_query_ids_are_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"].append(dict(fixture["queries"][0]))

        self.assertInvalid(fixture, "duplicate query_id")

    def test_invalid_query_type_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["query_type"] = "client_to_gigs"

        self.assertInvalid(fixture, "query_type")

    def test_empty_candidate_pool_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["candidate_entities"] = []

        self.assertInvalid(fixture, "at least one candidate")

    def test_empty_judgments_are_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"] = []

        self.assertInvalid(fixture, "at least one judgment")

    def test_duplicate_candidate_ids_are_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["candidate_entities"].append(dict(fixture["queries"][0]["candidate_entities"][0]))

        self.assertInvalid(fixture, "duplicate candidate_id")

    def test_duplicate_judgments_are_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"].append(dict(fixture["queries"][0]["judgments"][0]))

        self.assertInvalid(fixture, "duplicate judgment")

    def test_judgment_for_missing_candidate_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"][0]["candidate_id"] = "gig-missing"

        self.assertInvalid(fixture, "not in candidate pool")

    def test_invalid_relevance_label_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"][0]["relevance_label"] = 3

        self.assertInvalid(fixture, "must be 0, 1, or 2")

    def test_boolean_relevance_label_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"][0]["relevance_label"] = True

        self.assertInvalid(fixture, "must be 0, 1, or 2")

    def test_invalid_label_source_is_rejected(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"][0]["label_source"] = "model_guess"

        self.assertInvalid(fixture, "label_source")

    def test_complete_judgment_set_requires_every_candidate(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["judgments"].pop()

        self.assertInvalid(fixture, "complete judgment set")

    def test_incomplete_judgment_set_allows_unjudged_candidates(self):
        fixture = _valid_fixture()
        fixture["queries"][0]["is_complete_judgment_set"] = False
        fixture["queries"][0]["judgments"].pop()

        result = validate_evaluation_fixture(fixture)

        self.assertFalse(result.queries[0].is_complete_judgment_set)
        self.assertEqual(len(result.queries[0].judgments), 1)

    def test_duplicate_fixture_ids_across_seeded_files_are_rejected(self):
        first = _valid_fixture()
        second = _valid_fixture()
        with tempfile.TemporaryDirectory() as directory:
            fixture_dir = Path(directory)
            (fixture_dir / "a.json").write_text(json.dumps(first), encoding="utf-8")
            (fixture_dir / "b.json").write_text(json.dumps(second), encoding="utf-8")

            with self.assertRaisesRegex(EvaluationFixtureValidationError, "duplicate fixture_id"):
                load_seeded_evaluation_fixtures(fixture_dir)

    def assertInvalid(self, fixture, message_fragment):
        with self.assertRaisesRegex(EvaluationFixtureValidationError, message_fragment):
            validate_evaluation_fixture(fixture)


def _valid_fixture():
    return {
        "fixture_id": "fixture-test",
        "description": "Small deterministic seeded evaluation fixtures used to validate the evaluation data contract.",
        "queries": [
            {
                "query_id": "query-test",
                "query_type": "freelancer_to_gigs",
                "query_entity": {
                    "user_id": "freelancer-test",
                    "headline": "Backend developer",
                    "tech_categories": ["backend"],
                    "skills": ["Python", "FastAPI"],
                },
                "candidate_entities": [
                    {
                        "id": "gig-a",
                        "title": "Build FastAPI service",
                        "tech_category": "backend",
                        "required_skills": ["Python", "FastAPI"],
                        "status": "open",
                    },
                    {
                        "id": "gig-b",
                        "title": "Build React screen",
                        "tech_category": "frontend",
                        "required_skills": ["React"],
                        "status": "open",
                    },
                ],
                "judgments": [
                    {
                        "candidate_id": "gig-a",
                        "relevance_label": 2,
                        "label_source": "seeded_fixture",
                        "notes": "Strong seeded overlap.",
                    },
                    {
                        "candidate_id": "gig-b",
                        "relevance_label": 0,
                        "label_source": "manual_review",
                        "notes": "No backend skill overlap.",
                    },
                ],
                "is_complete_judgment_set": True,
                "notes": "Seeded local fixture, not production evaluation.",
            }
        ],
    }


if __name__ == "__main__":
    unittest.main()
