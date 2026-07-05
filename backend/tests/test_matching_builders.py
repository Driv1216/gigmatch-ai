import unittest
from dataclasses import fields

from app.matching import (
    FreelancerMatchProfile,
    GigMatchProfile,
    NormalizedSkill,
    build_freelancer_match_profile,
    build_gig_match_profile,
)


def skill_names(skills: tuple[NormalizedSkill, ...]) -> list[str]:
    return [skill.display_name for skill in skills]


def skill_sources(skills: tuple[NormalizedSkill, ...], name: str) -> tuple[str, ...]:
    for skill in skills:
        if skill.display_name == name:
            return skill.sources
    raise AssertionError(f"Skill {name!r} not found in {skill_names(skills)!r}")


class FreelancerMatchingBuilderTests(unittest.TestCase):
    def test_profile_skills_without_resume_parse(self):
        profile = {
            "user_id": "freelancer-1",
            "headline": "React engineer",
            "bio": "Builds polished web apps.",
            "primary_role": "Frontend Developer",
            "experience_level": "intermediate",
            "tech_categories": [" frontend ", "frontend", ""],
            "skills": ["React", " JS ", "react", ""],
            "tools": ["Figma", " figma ", None],
            "project_links": [" https://example.com/portfolio "],
        }

        result = build_freelancer_match_profile(profile)

        self.assertEqual(result.freelancer_id, "freelancer-1")
        self.assertEqual(result.headline, "React engineer")
        self.assertEqual(result.bio, "Builds polished web apps.")
        self.assertEqual(result.primary_role, "Frontend Developer")
        self.assertEqual(result.experience_level, "intermediate")
        self.assertEqual(result.categories, ("frontend",))
        self.assertEqual(skill_names(result.skills), ["React", "JavaScript"])
        self.assertEqual(result.tools, ("Figma",))
        self.assertEqual(result.project_domain_text, ("https://example.com/portfolio",))
        self.assertEqual(result.source_metadata["skills"], ("structured_profile",))

    def test_resume_parse_enriches_weak_empty_profile_skills(self):
        profile = {
            "user_id": "freelancer-2",
            "headline": "  ",
            "skills": ["", None],
            "tech_categories": None,
        }
        resume_parse = {
            "user_id": "freelancer-2",
            "skills": ["FastAPI", "postgres", "FASTAPI"],
            "categories": ["backend", " database "],
            "parsed_json": {
                "headline": "Backend API builder",
                "bio": "Ships Python services.",
                "primary_role": "Backend Developer",
                "tools": ["Docker"],
                "domain_text": "Fintech and workflow automation",
            },
        }

        result = build_freelancer_match_profile(profile, resume_parse)

        self.assertEqual(result.headline, "Backend API builder")
        self.assertEqual(result.bio, "Ships Python services.")
        self.assertEqual(result.primary_role, "Backend Developer")
        self.assertEqual(result.categories, ("backend", "database"))
        self.assertEqual(skill_names(result.skills), ["FastAPI", "PostgreSQL"])
        self.assertEqual(result.tools, ("Docker",))
        self.assertEqual(result.project_domain_text, ("Fintech and workflow automation",))
        self.assertEqual(result.source_metadata["headline"], ("resume_parse",))

    def test_profile_and_resume_parse_skills_merge_with_profile_precedence(self):
        profile = {
            "user_id": "freelancer-3",
            "headline": "Structured headline",
            "skills": ["React", "TypeScript", "GraphQL"],
            "tech_categories": ["frontend"],
        }
        resume_parse = {
            "skills": ["react.js", "Node.js", "graphql", " Python "],
            "categories": ["backend"],
            "parsed_json": {"headline": "Resume headline should not replace profile"},
        }

        result = build_freelancer_match_profile(profile, resume_parse)

        self.assertEqual(result.headline, "Structured headline")
        self.assertEqual(result.categories, ("frontend", "backend"))
        self.assertEqual(skill_names(result.skills), ["React", "TypeScript", "GraphQL", "Node.js", "Python"])
        self.assertEqual(skill_sources(result.skills, "React"), ("structured_profile", "resume_parse"))
        self.assertEqual(skill_sources(result.skills, "GraphQL"), ("structured_profile", "resume_parse"))
        self.assertEqual(result.source_metadata["skills"], ("structured_profile", "resume_parse"))

    def test_missing_optional_fields_and_null_arrays_do_not_crash(self):
        result = build_freelancer_match_profile({"user_id": "freelancer-4", "skills": None}, None)

        self.assertEqual(result.freelancer_id, "freelancer-4")
        self.assertIsNone(result.display_name)
        self.assertIsNone(result.headline)
        self.assertEqual(result.categories, ())
        self.assertEqual(result.skills, ())
        self.assertEqual(result.tools, ())
        self.assertEqual(result.project_domain_text, ())


class GigMatchingBuilderTests(unittest.TestCase):
    def test_structured_required_skills_without_gig_parse(self):
        gig = {
            "id": "gig-1",
            "client_id": "client-1",
            "title": "Build a dashboard",
            "description": "React dashboard with Supabase.",
            "tech_category": "frontend",
            "required_skills": ["React", "Supabase", "react"],
            "preferred_skills": ["Figma"],
            "difficulty_level": "intermediate",
            "seniority_needed": "junior",
            "deliverables": ["Dashboard", "Deployment"],
            "status": "open",
        }

        result = build_gig_match_profile(gig)

        self.assertEqual(result.gig_id, "gig-1")
        self.assertEqual(result.client_id, "client-1")
        self.assertEqual(result.title, "Build a dashboard")
        self.assertEqual(result.category, "frontend")
        self.assertEqual(skill_names(result.required_skills), ["React", "Supabase"])
        self.assertEqual(skill_names(result.preferred_skills), ["Figma"])
        self.assertEqual(skill_names(result.combined_skills), ["React", "Supabase", "Figma"])
        self.assertEqual(result.status, "open")
        self.assertEqual(result.source_metadata["required_skills"], ("structured_gig",))

    def test_gig_parse_with_empty_preferred_skills(self):
        gig = {
            "id": "gig-2",
            "client_id": "client-2",
            "title": "",
            "description": "",
            "required_skills": [],
            "preferred_skills": [],
            "status": "draft",
        }
        gig_parse = {
            "gig_id": "gig-2",
            "required_skills": ["Python", "FastAPI"],
            "preferred_skills": [],
            "seniority_level": "mid",
            "deliverables": ["API spec", "Working backend"],
            "parsed_json": {
                "title": "Parsed API build",
                "description": "Build a service in Python.",
                "category": "backend",
            },
        }

        result = build_gig_match_profile(gig, gig_parse)

        self.assertEqual(result.title, "Parsed API build")
        self.assertEqual(result.description, "Build a service in Python.")
        self.assertEqual(result.category, "backend")
        self.assertEqual(skill_names(result.required_skills), ["Python", "FastAPI"])
        self.assertEqual(result.preferred_skills, ())
        self.assertEqual(skill_names(result.combined_skills), ["Python", "FastAPI"])
        self.assertEqual(result.seniority_needed, "mid")
        self.assertEqual(result.deliverables, ("API spec", "Working backend"))
        self.assertEqual(result.status, "draft")

    def test_required_empty_preferred_empty_and_blank_strings_are_ignored(self):
        result = build_gig_match_profile(
            {
                "id": "gig-3",
                "required_skills": ["", "   ", None],
                "preferred_skills": "",
                "deliverables": [None, " "],
                "status": "closed",
            }
        )

        self.assertEqual(result.required_skills, ())
        self.assertEqual(result.preferred_skills, ())
        self.assertEqual(result.combined_skills, ())
        self.assertEqual(result.deliverables, ())
        self.assertEqual(result.status, "closed")

    def test_required_and_preferred_merge_deduplicates_casing_and_aliases(self):
        gig = {
            "id": "gig-4",
            "required_skills": ["JS", "React", "graphql"],
            "preferred_skills": ["javascript", "REACT", "Docker"],
        }
        gig_parse = {
            "required_skills": ["TypeScript", "GraphQL"],
            "preferred_skills": ["docker", "K8s"],
        }

        result = build_gig_match_profile(gig, gig_parse)

        self.assertEqual(skill_names(result.required_skills), ["JavaScript", "React", "GraphQL", "TypeScript"])
        self.assertEqual(skill_names(result.preferred_skills), ["JavaScript", "React", "Docker", "Kubernetes"])
        self.assertEqual(skill_names(result.combined_skills), ["JavaScript", "React", "GraphQL", "TypeScript", "Docker", "Kubernetes"])
        self.assertEqual(skill_sources(result.combined_skills, "JavaScript"), ("structured_gig",))
        self.assertEqual(skill_sources(result.combined_skills, "Docker"), ("structured_gig", "gig_parse"))

    def test_closed_and_draft_status_are_preserved_without_filtering(self):
        closed = build_gig_match_profile({"id": "gig-closed", "status": "closed"})
        draft = build_gig_match_profile({"id": "gig-draft", "status": "draft"})

        self.assertEqual(closed.status, "closed")
        self.assertEqual(draft.status, "draft")

    def test_matching_contract_has_no_scoring_or_embedding_fields(self):
        forbidden_fragments = ("score", "embedding", "similarity", "rank")

        freelancer_fields = {field.name for field in fields(FreelancerMatchProfile)}
        gig_fields = {field.name for field in fields(GigMatchProfile)}
        skill_fields = {field.name for field in fields(NormalizedSkill)}

        for field_name in freelancer_fields | gig_fields | skill_fields:
            with self.subTest(field_name=field_name):
                self.assertFalse(any(fragment in field_name for fragment in forbidden_fragments))


if __name__ == "__main__":
    unittest.main()
