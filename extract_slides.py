"""
Extract specific slides from PDF for testing
"""

import fitz  # PyMuPDF
import sys

def extract_slides(input_pdf_path, output_pdf_path, start_page, end_page):
    """
    Extract specific pages from PDF and save as new PDF
    
    Args:
        input_pdf_path: Path to input PDF
        output_pdf_path: Path to output PDF
        start_page: Starting page number (0-indexed)
        end_page: Ending page number (0-indexed, inclusive)
    """
    try:
        # Open the input PDF
        pdf_document = fitz.open(input_pdf_path)
        
        # Create a new PDF for the extracted pages
        new_pdf = fitz.open()
        
        # Extract pages from start_page to end_page (inclusive)
        for page_num in range(start_page, min(end_page + 1, len(pdf_document))):
            page = pdf_document.load_page(page_num)
            new_pdf.insert_pdf(pdf_document, from_page=page_num, to_page=page_num)
        
        # Save the new PDF
        new_pdf.save(output_pdf_path)
        new_pdf.close()
        pdf_document.close()
        
        print(f"✅ Extracted pages {start_page + 1}-{end_page + 1} to {output_pdf_path}")
        print(f"📄 Total pages extracted: {end_page - start_page + 1}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    input_pdf = "/Users/macbookpro/Downloads/bdl_1.pdf"
    output_pdf = "/Users/macbookpro/all_chatbots/diapos_ai/test_slides_15_20.pdf"
    
    # Extract pages 15-20 (0-indexed: 14-19)
    extract_slides(input_pdf, output_pdf, 14, 19)