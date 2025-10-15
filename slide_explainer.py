"""
PDF Slide Explainer using Flora Facturacion Infrastructure
Streamlit app that processes PDF slides and generates explanations for each slide
"""

import streamlit as st
import os
import base64
import json
from typing import List, Dict, Any
from openai import OpenAI
import fitz  # PyMuPDF for PDF processing
from PIL import Image
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
import tempfile

def encode_image_base64(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string"""
    return base64.b64encode(image_bytes).decode('utf-8')

def init_openai_client(api_key: str = None):
    """Initialize OpenAI client with API key"""
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return None
    
    try:
        return OpenAI(api_key=api_key)
    except Exception as e:
        st.error(f"❌ Error initializing OpenAI client: {str(e)}")
        return None

def extract_slides_from_pdf(pdf_file) -> List[bytes]:
    """
    Extract individual slides/pages from PDF as images
    
    Args:
        pdf_file: Uploaded PDF file from Streamlit
        
    Returns:
        List of image bytes for each slide
    """
    slides = []
    
    try:
        # Open PDF from uploaded file
        pdf_document = fitz.open(stream=pdf_file.read(), filetype="pdf")
        
        for page_num in range(len(pdf_document)):
            # Get page
            page = pdf_document.load_page(page_num)
            
            # Convert to image (300 DPI for good quality)
            mat = fitz.Matrix(300/72, 300/72)  # 300 DPI scaling
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PNG bytes
            img_data = pix.tobytes("png")
            slides.append(img_data)
            
        pdf_document.close()
        return slides
        
    except Exception as e:
        st.error(f"Error extracting slides from PDF: {str(e)}")
        return []

def explain_slide(slide_image_bytes: bytes, openai_client: OpenAI, slide_number: int, custom_prompt: str = None) -> Dict[str, Any]:
    """
    Generate explanation for a single slide using OpenAI Vision API
    
    Args:
        slide_image_bytes: Image bytes of the slide
        openai_client: OpenAI client instance
        slide_number: Number of the slide (for context)
        
    Returns:
        Dictionary with slide explanation and analysis
    """
    try:
        # Encode image to base64
        image_base64 = encode_image_base64(slide_image_bytes)
        image_url = f"data:image/png;base64,{image_base64}"
        
        # Use custom prompt if provided, otherwise use default
        if custom_prompt:
            explanation_prompt = custom_prompt.replace("{slide_number}", str(slide_number))
        else:
            explanation_prompt = f"""Analiza esta diapositiva (Slide #{slide_number}) y proporciona una explicación completa y estructurada:

🎯 **ANÁLISIS REQUERIDO:**

1. **TÍTULO/TEMA PRINCIPAL**
   - Identifica el título o tema central de la diapositiva

2. **CONTENIDO CLAVE**
   - Puntos principales presentados
   - Datos, estadísticas o información relevante
   - Conceptos importantes explicados

3. **ELEMENTOS VISUALES**
   - Gráficos, diagramas, imágenes
   - Tablas o listas
   - Elementos de diseño significativos

4. **CONTEXTO Y PROPÓSITO**
   - Objetivo de esta diapositiva
   - Audiencia objetivo probable
   - Mensaje clave que transmite

5. **INSIGHTS Y ANÁLISIS**
   - Observaciones importantes
   - Patrones o tendencias mostradas
   - Recomendaciones o conclusiones

FORMATO DE SALIDA (JSON):
{{
  "titulo": "Título o tema principal",
  "contenido_clave": [
    "Punto principal 1",
    "Punto principal 2",
    "..."
  ],
  "elementos_visuales": [
    "Descripción de gráfico/imagen 1",
    "Descripción de elemento visual 2",
    "..."
  ],
  "contexto": "Propósito y contexto de la diapositiva",
  "insights": [
    "Insight o análisis 1",
    "Insight o análisis 2",
    "..."
  ],
  "resumen": "Resumen ejecutivo de la diapositiva en 2-3 oraciones"
}}

**INSTRUCCIONES:**
- Sé específico y detallado en el análisis
- Extrae toda la información textual visible
- Describe elementos visuales de manera clara
- Proporciona insights valiosos sobre el contenido
- Mantén un tono profesional y analítico
"""
        
        # Call Vision API
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": explanation_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        # Parse response
        content = response.choices[0].message.content
        
        # Extract JSON from response
        if "```json" in content:
            json_start = content.find("```json") + 7
            json_end = content.find("```", json_start)
            json_str = content[json_start:json_end].strip()
        elif "```" in content:
            json_start = content.find("```") + 3
            json_end = content.find("```", json_start)
            json_str = content[json_start:json_end].strip()
        else:
            json_str = content.strip()
        
        # Parse JSON
        try:
            explanation_data = json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback: create structured response from raw text
            explanation_data = {
                "titulo": f"Slide {slide_number}",
                "contenido_clave": [content[:500] + "..." if len(content) > 500 else content],
                "elementos_visuales": ["Análisis visual disponible en respuesta completa"],
                "contexto": "Análisis de diapositiva",
                "insights": ["Ver respuesta completa para insights detallados"],
                "resumen": content[:200] + "..." if len(content) > 200 else content
            }
        
        return {
            "success": True,
            "slide_number": slide_number,
            "explanation": explanation_data,
            "raw_response": content
        }
        
    except Exception as e:
        return {
            "success": False,
            "slide_number": slide_number,
            "error": f"Error analyzing slide {slide_number}: {str(e)}"
        }

def generate_pdf_report(slides: List[bytes], explanations: List[Dict], pdf_name: str) -> bytes:
    """
    Generate a PDF report with slides and explanations
    
    Args:
        slides: List of slide image bytes
        explanations: List of explanation dictionaries
        pdf_name: Original PDF name for the report
        
    Returns:
        PDF bytes
    """
    # Create temporary file for PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        doc = SimpleDocTemplate(tmp_file.name, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            textColor=HexColor('#2E86AB'),
            alignment=1  # Center alignment
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            textColor=HexColor('#A23B72'),
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            leftIndent=20
        )
        
        # Build PDF content
        content = []
        
        # Title page
        content.append(Paragraph("📊 PDF Slide Analysis Report", title_style))
        content.append(Spacer(1, 20))
        content.append(Paragraph(f"Original PDF: {pdf_name}", styles['Normal']))
        content.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        content.append(Paragraph(f"Total Slides Analyzed: {len(slides)}", styles['Normal']))
        content.append(PageBreak())
        
        # Process each slide
        for i, (slide_bytes, explanation) in enumerate(zip(slides, explanations)):
            slide_num = i + 1
            
            # Slide title
            content.append(Paragraph(f"Slide {slide_num}", title_style))
            content.append(Spacer(1, 10))
            
            # Add slide image
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as img_tmp:
                    img_tmp.write(slide_bytes)
                    img_tmp.flush()
                    
                    # Resize image to fit page width (6 inches max)
                    slide_image = RLImage(img_tmp.name, width=6*inch, height=4.5*inch)
                    content.append(slide_image)
                    content.append(Spacer(1, 20))
            except Exception as e:
                content.append(Paragraph(f"Error loading slide image: {str(e)}", styles['Normal']))
                content.append(Spacer(1, 10))
            
            # Add explanation
            if explanation["success"]:
                exp_data = explanation["explanation"]
                
                # Title
                if exp_data.get('titulo'):
                    content.append(Paragraph("📌 Título", heading_style))
                    content.append(Paragraph(exp_data['titulo'], normal_style))
                    content.append(Spacer(1, 10))
                
                # Summary
                if exp_data.get('resumen'):
                    content.append(Paragraph("📝 Resumen", heading_style))
                    content.append(Paragraph(exp_data['resumen'], normal_style))
                    content.append(Spacer(1, 10))
                
                # Key content
                if exp_data.get('contenido_clave'):
                    content.append(Paragraph("🎯 Contenido Clave", heading_style))
                    for item in exp_data['contenido_clave']:
                        content.append(Paragraph(f"• {item}", normal_style))
                    content.append(Spacer(1, 10))
                
                # Visual elements
                if exp_data.get('elementos_visuales'):
                    content.append(Paragraph("👁️ Elementos Visuales", heading_style))
                    for item in exp_data['elementos_visuales']:
                        content.append(Paragraph(f"• {item}", normal_style))
                    content.append(Spacer(1, 10))
                
                # Context
                if exp_data.get('contexto'):
                    content.append(Paragraph("🎯 Contexto", heading_style))
                    content.append(Paragraph(exp_data['contexto'], normal_style))
                    content.append(Spacer(1, 10))
                
                # Insights
                if exp_data.get('insights'):
                    content.append(Paragraph("💡 Insights", heading_style))
                    for item in exp_data['insights']:
                        content.append(Paragraph(f"• {item}", normal_style))
                    content.append(Spacer(1, 10))
            
            else:
                content.append(Paragraph("❌ Error en el análisis", heading_style))
                content.append(Paragraph(explanation.get('error', 'Error desconocido'), normal_style))
            
            # Add page break except for last slide
            if i < len(slides) - 1:
                content.append(PageBreak())
        
        # Build PDF
        doc.build(content)
        
        # Read the generated PDF
        with open(tmp_file.name, 'rb') as f:
            pdf_bytes = f.read()
        
        # Clean up temp file
        os.unlink(tmp_file.name)
        
        return pdf_bytes

def main():
    """Main Streamlit application"""
    st.set_page_config(
        page_title="PDF Slide Explainer",
        page_icon="📊",
        layout="wide"
    )
    
    st.title("📊 PDF Slide Explainer")
    st.markdown("*Powered by Flora Facturación Infrastructure*")
    
    # Initialize session state
    if 'slides' not in st.session_state:
        st.session_state.slides = None
    if 'explanations' not in st.session_state:
        st.session_state.explanations = None
    if 'uploaded_file_name' not in st.session_state:
        st.session_state.uploaded_file_name = None
    if 'pdf_report' not in st.session_state:
        st.session_state.pdf_report = None
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        # API Key input
        st.subheader("🔑 OpenAI API Key")
        api_key_input = st.text_input(
            "Enter your OpenAI API Key:",
            type="password",
            help="Your API key will not be stored. Get one at https://platform.openai.com/api-keys"
        )
        
        # Custom prompt
        st.subheader("🎯 Custom Analysis Prompt")
        use_custom_prompt = st.checkbox("Use custom prompt", help="Customize the AI analysis prompt")
        
        custom_prompt = None
        if use_custom_prompt:
            custom_prompt = st.text_area(
                "Custom Prompt:",
                height=200,
                value="""Analiza esta diapositiva (Slide #{slide_number}) y proporciona una explicación completa y estructurada:

🎯 **ANÁLISIS REQUERIDO:**

1. **TÍTULO/TEMA PRINCIPAL**
   - Identifica el título o tema central de la diapositiva

2. **CONTENIDO CLAVE**
   - Puntos principales presentados
   - Datos, estadísticas o información relevante

FORMATO DE SALIDA (JSON):
{{
  "titulo": "Título o tema principal",
  "contenido_clave": ["Punto 1", "Punto 2"],
  "resumen": "Resumen ejecutivo"
}}""",
                help="Use {slide_number} as placeholder for slide number"
            )
    
    st.markdown("""
    Upload a PDF presentation and get detailed explanations for each slide using AI vision analysis.
    
    **Features:**
    - 🔍 AI-powered slide analysis using GPT-4 Vision
    - 📋 Structured explanations with key insights
    - 🖼️ Visual element recognition and description
    - 📊 Content extraction and summarization
    - 📄 Professional PDF report generation
    """)
    
    # Initialize OpenAI client
    openai_client = init_openai_client(api_key_input)
    
    if not openai_client:
        if not api_key_input:
            st.warning("⚠️ Please enter your OpenAI API Key in the sidebar to continue.")
        else:
            st.error("❌ Invalid OpenAI API Key. Please check your key.")
        st.stop()
    else:
        st.success("✅ OpenAI client initialized successfully")
    
    # File upload
    st.subheader("📁 Upload PDF Presentation")
    uploaded_file = st.file_uploader(
        "Choose a PDF file",
        type=['pdf'],
        help="Upload a PDF presentation to analyze each slide"
    )
    
    if uploaded_file is not None:
        st.success(f"✅ File uploaded: {uploaded_file.name}")
        
        # Check if this is a new file or same file
        if st.session_state.uploaded_file_name != uploaded_file.name:
            # New file - clear previous results
            st.session_state.slides = None
            st.session_state.explanations = None
            st.session_state.pdf_report = None
            st.session_state.uploaded_file_name = uploaded_file.name
            
            # Extract slides
            with st.spinner("🔄 Extracting slides from PDF..."):
                st.session_state.slides = extract_slides_from_pdf(uploaded_file)
        
        if not st.session_state.slides:
            st.error("❌ Failed to extract slides from PDF")
            return
        
        st.success(f"✅ Extracted {len(st.session_state.slides)} slides")
        
        # Process slides
        if st.session_state.explanations is None:
            if st.button("🚀 Analyze All Slides", type="primary"):
                
                # Create progress tracking
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                explanations = []
                
                for i, slide_bytes in enumerate(st.session_state.slides):
                    slide_num = i + 1
                    status_text.text(f"Analyzing slide {slide_num} of {len(st.session_state.slides)}...")
                    
                    # Analyze slide
                    explanation = explain_slide(slide_bytes, openai_client, slide_num, custom_prompt)
                    explanations.append(explanation)
                    
                    # Update progress
                    progress_bar.progress((i + 1) / len(st.session_state.slides))
                
                status_text.text("✅ Analysis complete!")
                
                # Store results in session state
                st.session_state.explanations = explanations
        
        # Display results if available
        if st.session_state.explanations is not None:
            st.subheader("📋 Slide Analysis Results")
            
            for i, (slide_bytes, explanation) in enumerate(zip(st.session_state.slides, st.session_state.explanations)):
                slide_num = i + 1
                
                with st.expander(f"📊 Slide {slide_num} Analysis", expanded=True):
                    
                    # Display slide image (larger, full width)
                    st.subheader(f"🖼️ Slide {slide_num}")
                    st.image(slide_bytes, caption=f"Slide {slide_num}", width=800)
                    
                    # Add some space
                    st.markdown("---")
                    
                    # Display explanation below the image
                    st.subheader("🔍 AI Analysis")
                    
                    if explanation["success"]:
                        exp_data = explanation["explanation"]
                        
                        # Title
                        st.markdown(f"**📌 Título:** {exp_data.get('titulo', 'N/A')}")
                        
                        # Summary
                        st.markdown(f"**📝 Resumen:** {exp_data.get('resumen', 'N/A')}")
                        
                        # Key content
                        if exp_data.get('contenido_clave'):
                            st.markdown("**🎯 Contenido Clave:**")
                            for item in exp_data['contenido_clave']:
                                st.markdown(f"• {item}")
                        
                        # Visual elements
                        if exp_data.get('elementos_visuales'):
                            st.markdown("**👁️ Elementos Visuales:**")
                            for item in exp_data['elementos_visuales']:
                                st.markdown(f"• {item}")
                        
                        # Context
                        if exp_data.get('contexto'):
                            st.markdown(f"**🎯 Contexto:** {exp_data['contexto']}")
                        
                        # Insights
                        if exp_data.get('insights'):
                            st.markdown("**💡 Insights:**")
                            for item in exp_data['insights']:
                                st.markdown(f"• {item}")
                    
                    else:
                        st.error(f"❌ {explanation.get('error', 'Unknown error')}")
            
            # Export options
            st.subheader("📤 Export Results")
            
            col1, col2 = st.columns(2)
            
            with col1:
                # JSON Export
                export_data = {
                    "pdf_name": st.session_state.uploaded_file_name,
                    "total_slides": len(st.session_state.slides),
                    "analysis_timestamp": str(datetime.now()),
                    "explanations": st.session_state.explanations
                }
                
                export_json = json.dumps(export_data, indent=2, ensure_ascii=False)
                
                st.download_button(
                    label="📥 Download Analysis as JSON",
                    data=export_json,
                    file_name=f"{st.session_state.uploaded_file_name.replace('.pdf', '')}_analysis.json",
                    mime="application/json",
                    key="json_download"
                )
            
            with col2:
                # PDF Export
                if st.button("📄 Generate PDF Report", key="generate_pdf"):
                    with st.spinner("🔄 Generating PDF report..."):
                        try:
                            st.session_state.pdf_report = generate_pdf_report(
                                st.session_state.slides, 
                                st.session_state.explanations, 
                                st.session_state.uploaded_file_name
                            )
                            st.success("✅ PDF report generated successfully!")
                            
                        except Exception as e:
                            st.error(f"❌ Error generating PDF: {str(e)}")
                
                # Show PDF download button if report is generated
                if st.session_state.pdf_report is not None:
                    st.download_button(
                        label="📥 Download PDF Report",
                        data=st.session_state.pdf_report,
                        file_name=f"{st.session_state.uploaded_file_name.replace('.pdf', '')}_analysis_report.pdf",
                        mime="application/pdf",
                        key="pdf_download"
                    )

if __name__ == "__main__":
    main()