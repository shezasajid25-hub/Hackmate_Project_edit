# seed.py
from database import SessionLocal, engine, Base
import models

Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        # Wipe database if it exists to clean structural updates
        db.query(models.Invitation).delete()
        db.query(models.Team).delete()
        db.query(models.Hackathon).delete()
        db.query(models.User).delete()
        db.query(models.Skill).delete()
        db.commit()

        print("Seeding ecosystem data...")

        # Skills
        python = models.Skill(skill_name="Python")
        fastapi = models.Skill(skill_name="FastAPI")
        react = models.Skill(skill_name="React")

        # Hackathon Event
        mega_hack = models.Hackathon(
            title="Global AI Hackathon 2026",
            description="Build scalable web applications using artificial intelligence.",
            date_string="2026-08-20"
        )
        db.add(mega_hack)
        db.flush() # Generates IDs in background

        # Users
        habeeba = models.User(name="Habeeba", email="habeeba@hackmate.com", role_preference="Backend Developer", skills=[python, fastapi])
        sheza = models.User(name="Sheza", email="sheza@hackmate.com", role_preference="Frontend UI Expert", skills=[react])
        db.add_all([habeeba, sheza])
        db.flush()

        # Habeeba creates a Team as Leader
        alpha_team = models.Team(
            team_name="Team Alpha",
            hackathon_id=mega_hack.id,
            leader_id=habeeba.id,
            skills_needed="React"
        )
        db.add(alpha_team)
        db.commit()
        
        print(f"Seeding Complete!\nHabeeba User ID: {habeeba.id}\nSheza User ID: {sheza.id}\nTeam Alpha ID: {alpha_team.id}")

    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()