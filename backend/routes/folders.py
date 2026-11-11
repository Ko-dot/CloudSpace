
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Folder
from schemas import FolderCreate, FolderResponse


router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


# Database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create a new folder
@router.post("/", response_model=FolderResponse)
def create_folder(
    folder: FolderCreate,
    db: Session = Depends(get_db)
):
    new_folder = Folder(name=folder.name)

    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    return new_folder


# Get all folders
@router.get("/", response_model=list[FolderResponse])
def get_folders(db: Session = Depends(get_db)):
    return db.query(Folder).all()


# Delete a folder
@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id
    ).first()

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    db.delete(folder)
    db.commit()

    return {
        "message": "Folder deleted successfully"
    }
