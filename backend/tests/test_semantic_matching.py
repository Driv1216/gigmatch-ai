import inspect
import sys
import types
import unittest
from unittest.mock import patch

from app.matching import (
    DeterministicFakeEmbeddingProvider,
    EmbeddingInputPolicy,
    SentenceTransformerEmbeddingProvider,
    build_freelancer_embedding_text,
    build_freelancer_match_profile,
    build_gig_embedding_text,
    build_gig_match_profile,
    cosine_similarity,
    prepare_embedding_input,
)
from app.matching import semantic


class SemanticMatchingTests(unittest.TestCase):
    def test_freelancer_embedding_text_includes_available_profile_fields(self):
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-1",
                "headline": "Backend-focused AI SaaS developer",
                "bio": "Builds document parsing and matching systems.",
                "primary_role": "Full-stack developer",
                "experience_level": "intermediate",
                "tech_categories": ["AI/ML", "Full-stack development"],
                "skills": ["React", "FastAPI", "PostgreSQL", "Supabase"],
                "tools": ["GitHub", "Docker"],
                "project_links": ["AI scholarship matcher"],
            }
        )

        text = build_freelancer_embedding_text(freelancer)

        self.assertEqual(
            text,
            "\n".join(
                [
                    "Role: Full-stack developer.",
                    "Headline: Backend-focused AI SaaS developer.",
                    "Experience level: intermediate.",
                    "Categories: AI/ML, Full-stack development.",
                    "Skills: React, FastAPI, PostgreSQL, Supabase.",
                    "Tools: GitHub, Docker.",
                    "Profile: Builds document parsing and matching systems.",
                    "Project/domain text: AI scholarship matcher.",
                ]
            ),
        )

    def test_gig_embedding_text_includes_available_gig_fields(self):
        gig = build_gig_match_profile(
            {
                "id": "gig-1",
                "title": "Build AI-powered dashboard",
                "description": "Build a dashboard for parsing and ranking documents.",
                "tech_category": "AI/ML",
                "required_skills": ["React", "FastAPI", "PostgreSQL"],
                "preferred_skills": ["Supabase", "document parsing"],
                "difficulty_level": "intermediate",
                "seniority_needed": "mid",
                "deliverables": ["dashboard", "API", "database integration"],
            }
        )

        text = build_gig_embedding_text(gig)

        self.assertEqual(
            text,
            "\n".join(
                [
                    "Gig: Build AI-powered dashboard.",
                    "Category: AI/ML.",
                    "Required skills: React, FastAPI, PostgreSQL.",
                    "Preferred skills: Supabase, document parsing.",
                    "Difficulty: intermediate.",
                    "Seniority: mid.",
                    "Deliverables: dashboard, API, database integration.",
                    "Description: Build a dashboard for parsing and ranking documents.",
                ]
            ),
        )

    def test_empty_fields_are_skipped_without_raw_empty_values(self):
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-2",
                "headline": "",
                "bio": None,
                "primary_role": "  ",
                "tech_categories": [],
                "skills": [],
                "tools": None,
            }
        )
        gig = build_gig_match_profile(
            {
                "id": "gig-2",
                "title": "  ",
                "description": None,
                "required_skills": [],
                "preferred_skills": [],
            }
        )

        freelancer_text = build_freelancer_embedding_text(freelancer)
        gig_text = build_gig_embedding_text(gig)

        self.assertEqual(freelancer_text, "")
        self.assertEqual(gig_text, "")
        for text in (freelancer_text, gig_text):
            self.assertNotIn("None", text)
            self.assertNotIn("[]", text)
            self.assertNotIn("{}", text)

    def test_text_output_is_deterministic_and_deduplicates_skills(self):
        freelancer = build_freelancer_match_profile(
            {
                "user_id": "freelancer-3",
                "primary_role": "Frontend developer",
                "skills": ["React", "react.js", "REACT", "JS", "JavaScript"],
                "tech_categories": ["frontend", "Frontend"],
            }
        )

        first = build_freelancer_embedding_text(freelancer)
        second = build_freelancer_embedding_text(freelancer)

        self.assertEqual(first, second)
        self.assertEqual(first.count("React"), 1)
        self.assertEqual(first.count("JavaScript"), 1)
        self.assertIn("Skills: React, JavaScript.", first)

    def test_fake_embedding_provider_returns_stable_vectors(self):
        provider = DeterministicFakeEmbeddingProvider(dimensions=6)
        other_provider = DeterministicFakeEmbeddingProvider(dimensions=6)

        first = provider.encode("same text")
        second = provider.encode("same text")
        from_other_instance = other_provider.encode("same text")
        different = provider.encode("different text")

        self.assertEqual(first, second)
        self.assertEqual(first, from_other_instance)
        self.assertNotEqual(first, different)
        self.assertEqual(len(first), 6)
        self.assertTrue(all(isinstance(value, float) for value in first))

    def test_fake_embedding_provider_supports_batch_encoding(self):
        provider = DeterministicFakeEmbeddingProvider(dimensions=4)

        batch = provider.encode_batch(["alpha", "beta", "alpha"])

        self.assertEqual(batch[0], provider.encode("alpha"))
        self.assertEqual(batch[1], provider.encode("beta"))
        self.assertEqual(batch[2], provider.encode("alpha"))
        self.assertEqual(len(batch), 3)

    def test_fake_embedding_provider_rejects_invalid_dimensions(self):
        with self.assertRaisesRegex(ValueError, "greater than zero"):
            DeterministicFakeEmbeddingProvider(dimensions=0)

    def test_model_input_policies_are_isolated_from_canonical_text(self):
        canonical = "Role: Backend engineer."

        self.assertEqual(prepare_embedding_input(canonical, EmbeddingInputPolicy.PLAIN, is_query=True), canonical)
        self.assertEqual(prepare_embedding_input(canonical, EmbeddingInputPolicy.PLAIN, is_query=False), canonical)
        self.assertEqual(
            prepare_embedding_input(canonical, EmbeddingInputPolicy.BGE_RETRIEVAL, is_query=True),
            "Represent this sentence for searching relevant passages: Role: Backend engineer.",
        )
        self.assertEqual(
            prepare_embedding_input(canonical, EmbeddingInputPolicy.BGE_RETRIEVAL, is_query=False),
            canonical,
        )
        self.assertEqual(
            prepare_embedding_input(canonical, EmbeddingInputPolicy.E5_RETRIEVAL, is_query=True),
            "query: Role: Backend engineer.",
        )
        self.assertEqual(
            prepare_embedding_input(canonical, EmbeddingInputPolicy.E5_RETRIEVAL, is_query=False),
            "passage: Role: Backend engineer.",
        )

    def test_real_provider_wrapper_locks_revision_cpu_and_remote_code_policy(self):
        stub = StubSentenceTransformer()
        module = types.SimpleNamespace(SentenceTransformer=lambda *args, **kwargs: stub.capture(*args, **kwargs))

        with patch.dict(sys.modules, {"sentence_transformers": module}):
            provider = SentenceTransformerEmbeddingProvider(
                "locked/model",
                revision="a" * 40,
                input_policy=EmbeddingInputPolicy.E5_RETRIEVAL,
                cache_folder="/tmp/locked-cache",
                local_files_only=True,
            )
            vectors = provider.encode_batch(["query: alpha", "passage: beta"])

        self.assertEqual(stub.model_name, "locked/model")
        self.assertEqual(stub.kwargs["revision"], "a" * 40)
        self.assertEqual(stub.kwargs["device"], "cpu")
        self.assertFalse(stub.kwargs["trust_remote_code"])
        self.assertTrue(stub.kwargs["local_files_only"])
        self.assertEqual(stub.encoded_texts, ["query: alpha", "passage: beta"])
        self.assertTrue(stub.encode_kwargs["normalize_embeddings"])
        self.assertEqual(vectors, [[1.0, 0.0], [1.0, 1.0]])

    def test_cosine_similarity_handles_identical_and_opposite_vectors(self):
        self.assertAlmostEqual(cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 1.0)
        self.assertAlmostEqual(cosine_similarity([1.0, 0.0], [-1.0, 0.0]), -1.0)

    def test_cosine_similarity_handles_zero_vectors_safely(self):
        self.assertEqual(cosine_similarity([0.0, 0.0], [1.0, 2.0]), 0.0)
        self.assertEqual(cosine_similarity([1.0, 2.0], [0.0, 0.0]), 0.0)

    def test_cosine_similarity_handles_dimension_mismatch_clearly(self):
        with self.assertRaisesRegex(ValueError, "same dimension"):
            cosine_similarity([1.0, 2.0], [1.0])

    def test_cosine_similarity_rejects_empty_vectors(self):
        with self.assertRaisesRegex(ValueError, "must not be empty"):
            cosine_similarity([], [])

    def test_real_provider_is_not_loaded_during_normal_tests(self):
        self.assertNotIn("sentence_transformers", sys.modules)

    def test_no_ranking_api_or_supabase_behavior_is_introduced(self):
        public_callables = {
            name
            for name, value in inspect.getmembers(semantic)
            if not name.startswith("_") and callable(value)
        }

        self.assertNotIn("rank_semantic_matches", public_callables)
        self.assertNotIn("rank_gigs_by_semantic_similarity", public_callables)
        self.assertNotIn("APIRouter", public_callables)
        self.assertNotIn("FastAPI", public_callables)

        source = inspect.getsource(semantic)
        self.assertNotIn("supabase", source.lower())
        self.assertNotIn(".insert(", source)
        self.assertNotIn(".update(", source)


class StubSentenceTransformer:
    def capture(self, model_name, **kwargs):
        self.model_name = model_name
        self.kwargs = kwargs
        return self

    def encode(self, texts, **kwargs):
        self.encoded_texts = list(texts)
        self.encode_kwargs = kwargs
        return [[1.0, float(index)] for index, _ in enumerate(texts)]


if __name__ == "__main__":
    unittest.main()
