import unittest
import zipfile
from io import BytesIO
from xml.sax.saxutils import escape

from app.services.document_text_extractor import (
    SCANNED_PDF_WARNING,
    DocumentTextExtractionError,
    extract_text_from_docx_bytes,
    extract_text_from_document_bytes,
    extract_text_from_pdf_bytes,
)


def make_test_pdf(text: str) -> bytes:
    content = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        b"5 0 obj << /Length " + str(len(content)).encode("ascii") + b" >> stream\n" + content + b"\nendstream endobj\n",
    ]
    return build_pdf(objects)


def make_blank_pdf() -> bytes:
    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n",
    ]
    return build_pdf(objects)


def build_pdf(objects: list[bytes]) -> bytes:
    document = BytesIO()
    document.write(b"%PDF-1.4\n")
    offsets = [0]

    for pdf_object in objects:
        offsets.append(document.tell())
        document.write(pdf_object)

    xref_offset = document.tell()
    document.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    document.write(b"0000000000 65535 f \n")

    for offset in offsets[1:]:
        document.write(f"{offset:010d} 00000 n \n".encode("ascii"))

    document.write(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return document.getvalue()


def make_test_docx(paragraphs: list[str]) -> bytes:
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(f"<w:p><w:r><w:t>{escape(paragraph)}</w:t></w:r></w:p>" for paragraph in paragraphs)
        + "</w:body></w:document>"
    )

    content_types = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    relationships = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )

    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as document_zip:
        document_zip.writestr("[Content_Types].xml", content_types)
        document_zip.writestr("_rels/.rels", relationships)
        document_zip.writestr("word/document.xml", document_xml)

    return output.getvalue()


class DocumentTextExtractorTests(unittest.TestCase):
    def test_valid_pdf_with_selectable_text_extracts_expected_content(self):
        result = extract_text_from_document_bytes(make_test_pdf("GigMatch PDF Resume"), "resume.pdf")

        self.assertIn("GigMatch PDF Resume", result.text)
        self.assertEqual(result.metadata.file_type, "pdf")
        self.assertEqual(result.metadata.page_count, 1)
        self.assertEqual(result.metadata.character_count, len(result.text))
        self.assertEqual(result.metadata.warnings, [])

    def test_valid_docx_extracts_expected_content(self):
        result = extract_text_from_document_bytes(
            make_test_docx(["GigMatch DOCX Resume", "React FastAPI PostgreSQL"]),
            "resume.docx",
        )

        self.assertIn("GigMatch DOCX Resume", result.text)
        self.assertIn("React FastAPI PostgreSQL", result.text)
        self.assertEqual(result.metadata.file_type, "docx")
        self.assertEqual(result.metadata.paragraph_count, 2)
        self.assertEqual(result.metadata.character_count, len(result.text))

    def test_unsupported_extension_is_rejected(self):
        with self.assertRaisesRegex(DocumentTextExtractionError, "Unsupported document type"):
            extract_text_from_document_bytes(b"hello", "resume.txt")

    def test_empty_bytes_fail_clearly(self):
        with self.assertRaisesRegex(DocumentTextExtractionError, "empty"):
            extract_text_from_document_bytes(b"", "resume.pdf")

    def test_invalid_pdf_content_fails_clearly(self):
        with self.assertRaisesRegex(DocumentTextExtractionError, "Invalid|Unable"):
            extract_text_from_pdf_bytes(b"not a pdf")

    def test_invalid_docx_content_fails_clearly(self):
        with self.assertRaisesRegex(DocumentTextExtractionError, "Invalid|Unable"):
            extract_text_from_docx_bytes(b"not a docx")

    def test_blank_pdf_returns_scanned_style_warning(self):
        result = extract_text_from_pdf_bytes(make_blank_pdf())

        self.assertEqual(result.metadata.file_type, "pdf")
        self.assertEqual(result.metadata.page_count, 1)
        self.assertEqual(result.text, "")
        self.assertIn(SCANNED_PDF_WARNING, result.metadata.warnings)

    def test_near_empty_docx_returns_safe_empty_result_with_warning(self):
        result = extract_text_from_docx_bytes(make_test_docx(["", "   "]))

        self.assertEqual(result.metadata.file_type, "docx")
        self.assertEqual(result.metadata.paragraph_count, 2)
        self.assertEqual(result.text, "")
        self.assertIn("did not contain readable paragraph text", result.metadata.warnings[0])

    def test_docx_with_unicode_and_special_characters_extracts_text(self):
        result = extract_text_from_document_bytes(
            make_test_docx(["Café résumé: C++, C#, .NET, R&D, São Paulo"]),
            "resume.docx",
        )

        self.assertIn("Café résumé", result.text)
        self.assertIn("C++, C#, .NET, R&D, São Paulo", result.text)
        self.assertEqual(result.metadata.warnings, [])

    def test_pdf_with_special_characters_extracts_text(self):
        result = extract_text_from_document_bytes(make_test_pdf("Cafe resume: C++ C# .NET"), "resume.pdf")

        self.assertIn("Cafe resume", result.text)
        self.assertIn("C++ C# .NET", result.text)

    def test_docx_with_repeated_long_text_extracts_without_truncation(self):
        repeated_text = "React FastAPI PostgreSQL " * 200

        result = extract_text_from_document_bytes(make_test_docx([repeated_text]), "resume.docx")

        self.assertEqual(result.text, repeated_text.strip())
        self.assertEqual(result.metadata.character_count, len(result.text))
