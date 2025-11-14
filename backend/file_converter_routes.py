from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from pdf2docx import Converter
import os
import tempfile
import shutil
import subprocess

router = APIRouter(prefix="/convert_file", tags=["File Converter"])

def convert_docx_to_pdf_libreoffice(input_path: str, output_dir: str) -> str:
    """
    Converts DOCX to PDF using LibreOffice headless mode (preserves formatting).
    """
    try:
        subprocess.run(
            ["libreoffice", "--headless", "--convert-to", "pdf", input_path, "--outdir", output_dir],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        output_path = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + ".pdf")
        return output_path
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"LibreOffice conversion failed: {e.stderr.decode('utf-8')}")


@router.post(
    "/",
    summary="Convert uploaded file (PDF <-> DOCX)",
    description="Upload a PDF or DOCX file and specify target format (`pdf` or `docx`). Returns the converted file as blob.",
)
async def convert_file(
    file: UploadFile = File(..., description="Upload a PDF or DOCX file"),
    target_format: str = Form(..., description="Target format: pdf or docx"),
):
    try:
        tmp_dir = tempfile.mkdtemp()
        input_path = os.path.join(tmp_dir, file.filename)

        # Save uploaded file
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        base_name, ext = os.path.splitext(file.filename)
        ext = ext.lower()
        output_path = os.path.join(tmp_dir, f"{base_name}.{target_format}")

        if ext == ".pdf" and target_format == "docx":
            # PDF → DOCX
            cv = Converter(input_path)
            cv.convert(output_path, start=0, end=None)
            cv.close()

        elif ext == ".docx" and target_format == "pdf":
            # DOCX → PDF using LibreOffice (perfect fidelity)
            output_path = convert_docx_to_pdf_libreoffice(input_path, tmp_dir)

        else:
            shutil.rmtree(tmp_dir)
            return JSONResponse(
                {"error": f"Unsupported conversion: {ext} → {target_format}"},
                status_code=400,
            )

        if not os.path.exists(output_path):
            shutil.rmtree(tmp_dir)
            return JSONResponse({"error": "Conversion failed"}, status_code=500)

        return FileResponse(
            output_path,
            media_type="application/octet-stream",
            filename=os.path.basename(output_path),
        )

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
