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

# === Prompt template por defecto ===
PROMPT_TEMPLATE = """\
Hazme una explicación **completa, clara y dinámica** sobre este texto.
Debe permitir al lector **entender todo el contenido técnico de manera fácil y ordenada**,
sin extenderse demasiado ni omitir ningún detalle importante.
Incluye ejemplos o analogías cuando ayuden a comprender mejor.
Al final, agrega un **resumen corto** con lo más importante de toda la explicación.

🎯 OBJETIVO GENERAL
- Que sea **profunda pero comprensible**, con rigor técnico y tono didáctico.
- Que ayude a **aprender de forma rápida**.
- Que combine explicación fluida con **puntos clave**.

🧩 INSTRUCCIONES
1) Explica el tema principal y por qué es relevante.
2) Explica cada punto técnico con claridad (mantén términos en inglés si aplica).
3) Resume en puntos clave.
4) Conecta con temas relacionados.
5) Cierra con un **resumen corto** (2–3 frases).

📘 FORMATO DE SALIDA
Devuelve **únicamente** un **objeto JSON válido** (sin texto adicional, sin comentarios).
NO copies literalmente el ejemplo; rellénalo con el contenido del slide.

```json
{
  "titulo": "Tema o concepto central de la diapositiva",
  "explicacion_didactica": "Explicación completa y clara...",
  "puntos_clave": ["Idea 1", "Idea 2", "Idea 3"],
  "conexiones": "Relaciones con otros temas",
  "resumen_corto": "Síntesis breve (2–3 frases)"
}
"""


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
            explanation_prompt = PROMPT_TEMPLATE.format(slide_number=slide_number)

        
        # Call Vision API
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},  # <— AÑADIR
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": explanation_prompt},
                        {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}}
                    ]
                }
            ],
            max_tokens=2000,
            temperature=0  # <— BAJAR A 0
        )
        
        # Parse response
        content = response.choices[0].message.content

        # Intento directo (porque response_format=json_object suele devolver JSON puro)
        try:
            explanation_data = json.loads(content)
        except Exception:
            # Fallbacks: bloques ```json ... ``` o ``` ... ```
            import re
            m = re.search(r"```json\s*(\{.*?\})\s*```", content, re.S) or \
                re.search(r"```\s*(\{.*?\})\s*```", content, re.S) or \
                re.search(r"(\{.*\})", content, re.S)
            if not m:
                # Último recurso: eliminar ecos del ejemplo {{ ... }} y meterlo como texto
                cleaned = re.sub(r"\{\{[\s\S]*?\}\}", "", content).strip()
                explanation_data = {
                    "titulo": f"Slide {slide_number}",
                    "explicacion_didactica": cleaned,
                    "puntos_clave": [],
                    "conexiones": "",
                    "resumen_corto": ""
                }
            else:
                explanation_data = json.loads(m.group(1))
        
        # === Normalización de esquema al nuevo formato ===
        # Si ya viene en el esquema nuevo, lo usamos tal cual:
        if all(k in explanation_data for k in ["titulo", "explicacion_didactica", "puntos_clave", "conexiones", "resumen_corto"]):
            normalized = {
                "titulo": explanation_data.get("titulo", ""),
                "explicacion_didactica": explanation_data.get("explicacion_didactica", ""),
                "puntos_clave": explanation_data.get("puntos_clave", []) or [],
                "conexiones": explanation_data.get("conexiones", ""),
                "resumen_corto": explanation_data.get("resumen_corto", "")
            }
        else:
            # Fallback desde el esquema antiguo
            titulo_old = explanation_data.get("titulo", f"Slide {slide_number}")
            contenido_clave_old = explanation_data.get("contenido_clave", [])
            contexto_old = explanation_data.get("contexto", "")
            insights_old = explanation_data.get("insights", [])
            resumen_old = explanation_data.get("resumen", "")

            # Construimos la explicación didáctica a partir de lo disponible
            explicacion_didactica_new = ""
            if isinstance(resumen_old, str) and resumen_old.strip():
                explicacion_didactica_new = resumen_old.strip()
            else:
                parts = []
                if isinstance(contenido_clave_old, list) and contenido_clave_old:
                    parts.append(" ".join(contenido_clave_old))
                if isinstance(contexto_old, str) and contexto_old.strip():
                    parts.append(contexto_old.strip())
                if isinstance(insights_old, list) and insights_old:
                    parts.append(" ".join(insights_old))
                explicacion_didactica_new = " ".join(p for p in parts if p).strip()

            normalized = {
                "titulo": titulo_old,
                "explicacion_didactica": explicacion_didactica_new or "Explicación generada automáticamente.",
                "puntos_clave": contenido_clave_old if isinstance(contenido_clave_old, list) else [],
                "conexiones": contexto_old if isinstance(contexto_old, str) else "",
                "resumen_corto": resumen_old if isinstance(resumen_old, str) else ""
            }

        return {
            "success": True,
            "slide_number": slide_number,
            "explanation": normalized,
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
    tmp_pdf_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp_pdf_file.close()  # Close it so reportlab can write to it

    # Keep track of temporary image files to clean up later
    temp_image_files = []

    try:
        doc = SimpleDocTemplate(tmp_pdf_file.name, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)

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

        # Process each slide
        for i, (slide_bytes, explanation) in enumerate(zip(slides, explanations)):
            slide_num = i + 1

            # Slide title
            content.append(Paragraph(f"Slide {slide_num}", title_style))
            content.append(Spacer(1, 10))

            # Add slide image
            try:
                # Create temporary image file that persists during PDF building
                img_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                img_tmp.write(slide_bytes)
                img_tmp.close()  # Close file so reportlab can read it

                temp_image_files.append(img_tmp.name)  # Track for cleanup

                # Resize image to fit full page width (7.5 inches for A4 with margins)
                slide_image = RLImage(img_tmp.name, width=7.5*inch, height=5.6*inch)
                content.append(slide_image)
                content.append(Spacer(1, 20))
            except Exception as e:
                content.append(Paragraph(f"Error loading slide image: {str(e)}", styles['Normal']))
                content.append(Spacer(1, 10))

            # Add explanation
            if explanation["success"]:
                exp_data = explanation["explanation"]
                    
                title = exp_data.get('titulo') or ""
                exp_did = exp_data.get('explicacion_didactica') or ""
                resumen = exp_data.get('resumen') or ""
                resumen_corto = exp_data.get('resumen_corto') or ""
                puntos = exp_data.get('puntos_clave') or exp_data.get('contenido_clave') or []
                conex = exp_data.get('conexiones') or exp_data.get('contexto') or ""

                explicacion = exp_did if exp_did.strip() else resumen

                if title:
                    content.append(Paragraph("📌 Título", heading_style))
                    content.append(Paragraph(title, normal_style))
                    content.append(Spacer(1, 10))

                if explicacion:
                    content.append(Paragraph("🧠 Explicación didáctica", heading_style))
                    content.append(Paragraph(explicacion, normal_style))
                    content.append(Spacer(1, 10))

                if puntos:
                    content.append(Paragraph("🎯 Puntos clave", heading_style))
                    for item in puntos:
                        content.append(Paragraph(f"• {item}", normal_style))
                    content.append(Spacer(1, 10))

                if conex:
                    content.append(Paragraph("🔗 Conexiones", heading_style))
                    content.append(Paragraph(conex, normal_style))
                    content.append(Spacer(1, 10))

                # Solo muestra 'Resumen' si es distinto de la explicación
                if resumen and resumen.strip() != explicacion.strip():
                    content.append(Paragraph("📝 Resumen", heading_style))
                    content.append(Paragraph(resumen, normal_style))
                    content.append(Spacer(1, 10))

                # Solo muestra 'Resumen corto' si es distinto
                if resumen_corto and resumen_corto.strip() not in {resumen.strip(), explicacion.strip()}:
                    content.append(Paragraph("📝 Resumen corto", heading_style))
                    content.append(Paragraph(resumen_corto, normal_style))
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
        with open(tmp_pdf_file.name, 'rb') as f:
            pdf_bytes = f.read()

        return pdf_bytes

    finally:
        # Clean up temporary files
        try:
            os.unlink(tmp_pdf_file.name)
        except:
            pass

        for img_file in temp_image_files:
            try:
                os.unlink(img_file)
            except:
                pass

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
    if 'edited_explanations' not in st.session_state:
        st.session_state.edited_explanations = None
    if 'uploaded_file_name' not in st.session_state:
        st.session_state.uploaded_file_name = None
    if 'pdf_report' not in st.session_state:
        st.session_state.pdf_report = None
    if 'undo_stack' not in st.session_state:
        st.session_state.undo_stack = []
    if 'redo_stack' not in st.session_state:
        st.session_state.redo_stack = []
    if 'current_slide_view' not in st.session_state:
        st.session_state.current_slide_view = None
    
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
                value=PROMPT_TEMPLATE,
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
    - ✏️ **NEW:** Edit explanations inline
    - 🔍 **NEW:** Enlarge slides for better viewing
    - 🗑️ **NEW:** Delete unwanted slides
    - ↶↷ **NEW:** Undo/Redo functionality (Ctrl+Z / Ctrl+Shift+Z)
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
                st.session_state.edited_explanations = [exp.copy() for exp in explanations]  # Initialize edited version
        
        # Display results if available
        if st.session_state.explanations is not None:
            st.subheader("📋 Slide Analysis Results")

            # Undo/Redo buttons
            col1, col2, col3 = st.columns([1, 1, 2])
            with col1:
                if st.button("↶ Undo (Ctrl+Z)", disabled=len(st.session_state.undo_stack) == 0):
                    if st.session_state.undo_stack:
                        # Save current state to redo stack
                        st.session_state.redo_stack.append({
                            'slides': st.session_state.slides.copy(),
                            'edited_explanations': [exp.copy() for exp in st.session_state.edited_explanations]
                        })
                        # Restore from undo stack
                        prev_state = st.session_state.undo_stack.pop()
                        st.session_state.slides = prev_state['slides']
                        st.session_state.edited_explanations = prev_state['edited_explanations']
                        st.rerun()

            with col2:
                if st.button("↷ Redo (Ctrl+Shift+Z)", disabled=len(st.session_state.redo_stack) == 0):
                    if st.session_state.redo_stack:
                        # Save current state to undo stack
                        st.session_state.undo_stack.append({
                            'slides': st.session_state.slides.copy(),
                            'edited_explanations': [exp.copy() for exp in st.session_state.edited_explanations]
                        })
                        # Restore from redo stack
                        next_state = st.session_state.redo_stack.pop()
                        st.session_state.slides = next_state['slides']
                        st.session_state.edited_explanations = next_state['edited_explanations']
                        st.rerun()

            # Use edited explanations if available, otherwise use original
            current_explanations = st.session_state.edited_explanations or st.session_state.explanations

            for i, (slide_bytes, explanation) in enumerate(zip(st.session_state.slides, current_explanations)):
                slide_num = i + 1

                with st.expander(f"📊 Slide {slide_num} Analysis", expanded=True):

                    # Slide controls
                    slide_col1, slide_col2, slide_col3 = st.columns([2, 1, 1])

                    with slide_col1:
                        # Click to enlarge slide
                        if st.button(f"🔍 Enlarge Slide {slide_num}", key=f"enlarge_{i}"):
                            st.session_state.current_slide_view = i
                            st.rerun()

                    with slide_col2:
                        # Edit button
                        if st.button(f"✏️ Edit Text", key=f"edit_{i}"):
                            st.session_state[f"edit_mode_{i}"] = not st.session_state.get(f"edit_mode_{i}", False)
                            st.rerun()

                    with slide_col3:
                        # Delete slide button
                        if st.button(f"🗑️ Delete", key=f"delete_{i}"):
                            # Save current state to undo stack
                            st.session_state.undo_stack.append({
                                'slides': st.session_state.slides.copy(),
                                'edited_explanations': [exp.copy() for exp in current_explanations]
                            })
                            # Remove slide and explanation
                            st.session_state.slides.pop(i)
                            current_explanations.pop(i)
                            st.session_state.edited_explanations = current_explanations
                            # Clear redo stack
                            st.session_state.redo_stack = []
                            st.rerun()

                    # Display slide image (larger, full width)
                    st.subheader(f"🖼️ Slide {slide_num}")
                    st.image(slide_bytes, caption=f"Slide {slide_num}", width='stretch')

                    # Add some space
                    st.markdown("---")

                    # Display explanation below the image
                    st.subheader("🔍 AI Analysis")

                    if explanation["success"]:
                        exp_data = explanation["explanation"]

                        # Check if in edit mode
                        edit_mode = st.session_state.get(f"edit_mode_{i}", False)

                        if edit_mode:
                            # Editable fields
                            st.markdown("### ✏️ Edit Mode")

                            # Title
                            new_title = st.text_input(
                                "📌 Título:",
                                value=exp_data.get('titulo', ''),
                                key=f"title_{i}"
                            )

                            # Summary
                            new_resumen = st.text_area(
                                "📝 Resumen:",
                                value=exp_data.get('resumen', ''),
                                key=f"resumen_{i}",
                                height=100
                            )

                            # Key content
                            st.markdown("**🎯 Contenido Clave:**")
                            new_contenido_clave = []
                            if exp_data.get('contenido_clave'):
                                for j, item in enumerate(exp_data['contenido_clave']):
                                    new_item = st.text_input(
                                        f"Item {j+1}:",
                                        value=item,
                                        key=f"content_{i}_{j}"
                                    )
                                    new_contenido_clave.append(new_item)

                            # Visual elements
                            st.markdown("**👁️ Elementos Visuales:**")
                            new_elementos_visuales = []
                            if exp_data.get('elementos_visuales'):
                                for j, item in enumerate(exp_data['elementos_visuales']):
                                    new_item = st.text_input(
                                        f"Elemento {j+1}:",
                                        value=item,
                                        key=f"visual_{i}_{j}"
                                    )
                                    new_elementos_visuales.append(new_item)

                            # Context
                            new_contexto = st.text_area(
                                "🎯 Contexto:",
                                value=exp_data.get('contexto', ''),
                                key=f"contexto_{i}",
                                height=80
                            )

                            # Insights
                            st.markdown("**💡 Insights:**")
                            new_insights = []
                            if exp_data.get('insights'):
                                for j, item in enumerate(exp_data['insights']):
                                    new_item = st.text_input(
                                        f"Insight {j+1}:",
                                        value=item,
                                        key=f"insight_{i}_{j}"
                                    )
                                    new_insights.append(new_item)

                            # Save button
                            if st.button("💾 Save Changes", key=f"save_{i}"):
                                # Save current state to undo stack
                                st.session_state.undo_stack.append({
                                    'slides': st.session_state.slides.copy(),
                                    'edited_explanations': [exp.copy() for exp in current_explanations]
                                })

                                # Update the explanation
                                updated_exp = explanation.copy()
                                updated_exp["explanation"] = {
                                    'titulo': new_title,
                                    'resumen': new_resumen,
                                    'contenido_clave': new_contenido_clave,
                                    'elementos_visuales': new_elementos_visuales,
                                    'contexto': new_contexto,
                                    'insights': new_insights
                                }

                                # Update edited explanations
                                if st.session_state.edited_explanations is None:
                                    st.session_state.edited_explanations = [exp.copy() for exp in st.session_state.explanations]
                                st.session_state.edited_explanations[i] = updated_exp

                                # Clear redo stack
                                st.session_state.redo_stack = []

                                # Exit edit mode
                                st.session_state[f"edit_mode_{i}"] = False
                                st.success("✅ Changes saved!")
                                st.rerun()

                        else:
                            # Display mode (nuevo esquema con fallback)
                            st.markdown(f"**📌 Título:** {exp_data.get('titulo', 'N/A')}")

                            explicacion_ui = exp_data.get('explicacion_didactica') or exp_data.get('resumen') or 'N/A'
                            st.markdown("**🧠 Explicación didáctica:**")
                            st.write(explicacion_ui)

                            puntos_ui = exp_data.get('puntos_clave') or exp_data.get('contenido_clave') or []
                            if puntos_ui:
                                st.markdown("**🎯 Puntos clave:**")
                                for item in puntos_ui:
                                    st.markdown(f"- {item}")

                            conex_ui = exp_data.get('conexiones') or exp_data.get('contexto') or ''
                            if conex_ui:
                                st.markdown("**🔗 Conexiones:**")
                                st.write(conex_ui)

                            resumen_corto_ui = exp_data.get('resumen_corto') or exp_data.get('resumen') or ''
                            if resumen_corto_ui:
                                st.markdown("**📝 Resumen corto:**")
                                st.write(resumen_corto_ui)

                            insights_ui = exp_data.get('insights') or []


                    else:
                        st.error(f"❌ {explanation.get('error', 'Unknown error')}")

            # Modal for enlarged slide view
            if st.session_state.current_slide_view is not None:
                i = st.session_state.current_slide_view
                slide_bytes = st.session_state.slides[i]
                slide_num = i + 1

                with st.container():
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.image(slide_bytes, caption=f"Slide {slide_num} (Enlarged)", use_container_width=True)
                    with col2:
                        if st.button("❌ Close", key="close_enlarged"):
                            st.session_state.current_slide_view = None
                            st.rerun()
            
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
                    with st.spinner("🔄 Generating PDF report... This may take a moment depending on the number of slides."):
                        try:
                            # Use edited explanations if available, otherwise use original
                            explanations_to_use = st.session_state.edited_explanations or st.session_state.explanations
                            st.session_state.pdf_report = generate_pdf_report(
                                st.session_state.slides,
                                explanations_to_use,
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