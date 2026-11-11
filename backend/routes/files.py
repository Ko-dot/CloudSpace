
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from pathlib import Path
from typing import Optional
from uuid import uuid4
import shutil

from database import SessionLocal
from models import File as FileModel, Folder


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


# Physical storage location
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# Database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 1. Upload a file
@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if folder_id is not None:
        folder = db.query(Folder).filter(
            Folder.id == folder_id
        ).first()

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

    original_name = Path(file.filename).name

    # Generate a unique storage filename
    extension = Path(original_name).suffix
    stored_name = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_name

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = file_path.stat().st_size

        new_file = FileModel(
            name=original_name,
            file_type=file.content_type,
            size=file_size,
            storage_path=str(file_path),
            folder_id=folder_id
        )

        db.add(new_file)
        db.commit()
        db.refresh(new_file)

        return {
            "message": "File uploaded successfully",
            "id": new_file.id,
            "name": new_file.name,
            "size": new_file.size,
            "folder_id": new_file.folder_id
        }

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="File upload failed"
        )

    finally:
        file.file.close()


# 2. Get all active files
@router.get("/")
def get_files(db: Session = Depends(get_db)):
    files = db.query(FileModel).filter(
        FileModel.is_deleted == False
    ).all()

    return files


# 2. Get all deleted files (Trash)
@router.get("/trash")
def get_trash(db: Session = Depends(get_db)):
    files = db.query(FileModel).filter(
        FileModel.is_deleted == True
    ).all()

    return files



# 3. Download a file
@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.is_deleted == False
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    file_path = Path(file.storage_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Physical file not found"
        )

    return FileResponse(
        path=str(file_path),
        filename=file.name,
        media_type=file.file_type or "application/octet-stream"
    )


# 4. Rename a file
@router.put("/rename/{file_id}")
def rename_file(
    file_id: int,
    new_name: str,
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.is_deleted == False
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    new_name = new_name.strip()

    if not new_name or Path(new_name).name != new_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid file name"
        )

    file.name = new_name
    db.commit()
    db.refresh(file)

    return {
        "message": "File renamed successfully",
        "id": file.id,
        "new_name": file.name
    }


# 5. Move a file into a folder
@router.put("/move/{file_id}")
def move_file(
    file_id: int,
    folder_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.is_deleted == False
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if folder_id is not None:
        folder = db.query(Folder).filter(
            Folder.id == folder_id
        ).first()

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Destination folder not found"
            )

    file.folder_id = folder_id
    db.commit()

    return {
        "message": "File moved successfully",
        "file_id": file.id,
        "folder_id": file.folder_id
    }


# 6. Move a file to Trash
@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.is_deleted == False
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Soft delete: keep physical file
    file.is_deleted = True
    db.commit()

    return {
        "message": "File moved to Trash successfully"
    }


# 7. Restore a file from Trash
@router.put("/restore/{file_id}")
def restore_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    file = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.is_deleted == True
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="Deleted file not found"
        )

    file.is_deleted = False
    db.commit()

    return {
        "message": "File restored successfully",
        "id": file.id,
        "name": file.name
    }
