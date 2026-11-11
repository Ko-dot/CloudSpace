
from sqlalchemy import inspect, text

from database import engine, Base
import models


def migrate_database():
    # Create new tables, including users.
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)

    folder_columns = [
        column["name"]
        for column in inspector.get_columns("folders")
    ]

    file_columns = [
        column["name"]
        for column in inspector.get_columns("files")
    ]

    with engine.begin() as connection:

        # Add ownership columns if they don't exist.
        if "owner_id" not in folder_columns:
            connection.execute(text(
                "ALTER TABLE folders ADD COLUMN owner_id INTEGER REFERENCES users(id)"
            ))

        if "owner_id" not in file_columns:
            connection.execute(text(
                "ALTER TABLE files ADD COLUMN owner_id INTEGER REFERENCES users(id)"
            ))

        # Create a default account for existing data.
        connection.execute(text("""
            INSERT INTO users (name)
            SELECT 'CloudSpace Owner'
            WHERE NOT EXISTS (SELECT 1 FROM users)
        """))

        # Assign existing records to the default account.
        connection.execute(text("""
            UPDATE folders
            SET owner_id = (SELECT id FROM users ORDER BY id LIMIT 1)
            WHERE owner_id IS NULL
        """))

        connection.execute(text("""
            UPDATE files
            SET owner_id = (SELECT id FROM users ORDER BY id LIMIT 1)
            WHERE owner_id IS NULL
        """))

    print("Database migration completed successfully!")


if __name__ == "__main__":
    migrate_database()
