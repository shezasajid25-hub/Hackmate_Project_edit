from sqlalchemy import Column, Integer, String, ForeignKey, Table, Enum
from sqlalchemy.orm import relationship
import enum
from database import Base

# Junction table for Many-to-Many relationship between Users and Skills
user_skills = Table(
    "user_skills",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True)
)

# Junction table for Many-to-Many relationship between Teams and Members (Accepted)
team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)
)

# Enum to strictly track invitation states
class InviteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role_preference = Column(String)
    linkedin_url = Column(String, nullable=True)  # <-- Added to store their professional connection links!
    
    # Relationships
    skills = relationship("Skill", secondary=user_skills, back_populates="users")
    teams_joined = relationship("Team", secondary=team_members, back_populates="members")
    teams_led = relationship("Team", back_populates="leader")

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, unique=True, nullable=False)
    users = relationship("User", secondary=user_skills, back_populates="skills")

class Hackathon(Base):
    __tablename__ = "hackathons"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    date_string = Column(String) # e.g., "2026-06-15" for countdowns
    
    teams = relationship("Team", back_populates="hackathon")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    team_name = Column(String, nullable=False)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id"))
    leader_id = Column(Integer, ForeignKey("users.id"))
    skills_needed = Column(String) # Comma separated list like "React,Node"
    
    # Relationships
    hackathon = relationship("Hackathon", back_populates="teams")
    leader = relationship("User", back_populates="teams_led")
    members = relationship("User", secondary=team_members, back_populates="teams_joined")

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))    # The leader
    receiver_id = Column(Integer, ForeignKey("users.id"))  # The candidate
    status = Column(String, default=InviteStatus.PENDING)  # PENDING, ACCEPTED, DECLINED