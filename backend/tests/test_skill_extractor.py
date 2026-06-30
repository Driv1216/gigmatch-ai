import unittest

from app.parsing.skill_extractor import extract_skills


class SkillExtractorTests(unittest.TestCase):
    def test_extracts_basic_stack(self):
        result = extract_skills("Need React, FastAPI, PostgreSQL, Supabase, and Docker experience.")

        self.assertEqual(result["skills"], ["React", "FastAPI", "PostgreSQL", "Supabase", "Docker"])
        self.assertEqual(result["categories"], ["frontend", "backend", "database", "devops"])
        self.assertEqual(result["matched_terms"], ["react", "fastapi", "postgresql", "supabase", "docker"])
        self.assertEqual(result["unmatched_keywords"], [])
        self.assertEqual(result["confidence"], "deterministic")

    def test_js_maps_to_javascript(self):
        result = extract_skills("Looking for JS experience.")

        self.assertEqual(result["skills"], ["JavaScript"])
        self.assertEqual(result["matched_terms"], ["js"])

    def test_postgres_maps_to_postgresql(self):
        result = extract_skills("Strong postgres knowledge required.")

        self.assertEqual(result["skills"], ["PostgreSQL"])
        self.assertEqual(result["matched_terms"], ["postgres"])

    def test_node_js_variants_map_to_nodejs(self):
        result = extract_skills("Build APIs in node js and maintain node.js services.")

        self.assertEqual(result["skills"], ["Node.js"])
        self.assertEqual(result["matched_terms"], ["node js", "node.js"])

    def test_react_matches_but_reactive_does_not(self):
        self.assertEqual(extract_skills("React developer needed.")["skills"], ["React"])
        self.assertEqual(extract_skills("Reactive programming experience is useful.")["skills"], [])

    def test_symbol_heavy_skills_are_extracted(self):
        result = extract_skills("Need C++, C#, and .NET experience.")

        self.assertEqual(result["skills"], ["C++", "C#", ".NET"])
        self.assertEqual(result["matched_terms"], ["c++", "c#", ".net"])

    def test_duplicate_skill_mentions_are_removed(self):
        result = extract_skills("React, react.js, and ReactJS with postgres and PostgreSQL.")

        self.assertEqual(result["skills"], ["React", "PostgreSQL"])
        self.assertEqual(result["categories"], ["frontend", "database"])

    def test_categories_are_returned_for_multiple_domains(self):
        result = extract_skills("React with FastAPI, PostgreSQL, Docker, AWS, and Figma.")

        self.assertEqual(result["categories"], ["frontend", "backend", "database", "devops", "cloud", "design"])

    def test_empty_input_returns_empty_deterministic_result(self):
        result = extract_skills("")

        self.assertEqual(
            result,
            {
                "skills": [],
                "categories": [],
                "matched_terms": [],
                "unmatched_keywords": [],
                "confidence": "deterministic",
            },
        )
