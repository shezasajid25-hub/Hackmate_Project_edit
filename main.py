import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles 
from fastapi.responses import FileResponse   
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models

# Spin up database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HackMate API")

# =====================================================================
# SYSTEM UTILITIES / BACKGROUND TASKS
# =====================================================================

def send_email_notification(receiver_email: str, receiver_name: str, sender_name: str):
    """
    Asynchronously sends an automated text email alert to the invited hacker.
    Configure these with your real SMTP server details (e.g., Gmail SMTP).
    """
    msg = MIMEText(
        f"Hi {receiver_name},\n\n"
        f"Great news! {sender_name} has checked out your radar match scores on HackMate "
        f"and just sent you an invitation to join their hackathon team!\n\n"
        f"Log into HackMate to accept or decline the request.\n\n"
        f"Best of luck,\nTeam HackMate"
    )
    msg["Subject"] = f"🎯 HackMate: Team Invitation Received from {sender_name}!"
    msg["From"] = "hackmate.platform@gmail.com"  # Change to your verified system email
    msg["To"] = receiver_email

    try:
        # NOTE: For local testing, this prints directly to your server console.
        # To link a real email service, uncomment the lines below and use an App Password:
        # with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        #     server.login("your_email@gmail.com", "your_app_password")
        #     server.send_message(msg)
        print(f"[EMAIL SYSTEM] Invitation alert successfully routed to {receiver_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to dispatch alert: {e}")

# =====================================================================
# 1. PROFILE AND MATCHING ENDPOINTS
# =====================================================================

@app.get("/users/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {
        "id": db_user.id,
        "name": db_user.name,
        "role": db_user.role_preference,
        "skills": [skill.skill_name for skill in db_user.skills]
    }

@app.get("/users/{user_id}/match")
def match_user_to_requirements(user_id: int, team_needs: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    req_skills_set = {skill.strip().lower() for skill in team_needs.split(",") if skill.strip()}
    
    if not req_skills_set:
        return {
            "user_id": db_user.id,
            "user_name": db_user.name,
            "match_score": "0%",
            "score_number": 0,
            "skills_matched": [],
            "skills_missing": []
        }
        
    user_skills_set = {skill.skill_name.lower().strip() for skill in db_user.skills}
    
    matching_skills = user_skills_set.intersection(req_skills_set)
    missing_skills = req_skills_set.difference(user_skills_set)
    
    score_percentage = round((len(matching_skills) / len(req_skills_set)) * 100)
    
    return {
        "user_id": db_user.id,
        "user_name": db_user.name,
        "match_score": f"{score_percentage}%",
        "score_number": score_percentage, 
        "skills_matched": list(matching_skills),
        "skills_missing": list(missing_skills)
    }

# =====================================================================
# 2. GLOBAL RADAR DISCOVERY ENDPOINT
# =====================================================================

@app.get("/teams/{team_id}/discover-talent")
def discover_talent(team_id: int, team_needs: str, db: Session = Depends(get_db)):
    """
    Scans the entire database for available hackers, scoring each against 
    the requested skills, and returns their full profile data including LinkedIn links.
    """
    req_skills_set = {skill.strip().lower() for skill in team_needs.split(",") if skill.strip()}
    all_users = db.query(models.User).all()
    candidate_pool = []
    
    for user in all_users:
        user_skills_set = {skill.skill_name.lower().strip() for skill in user.skills}
        all_profile_skills = [skill.skill_name for skill in user.skills]
        
        if not req_skills_set:
            score_percentage = 0
            matching_skills = []
            missing_skills = []
        else:
            matching_skills = user_skills_set.intersection(req_skills_set)
            missing_skills = req_skills_set.difference(user_skills_set)
            score_percentage = round((len(matching_skills) / len(req_skills_set)) * 100)
        
        candidate_pool.append({
            "user_id": user.id,
            "user_name": user.name,
            "role_preference": user.role_preference,
            "match_score": f"{score_percentage}%",
            "score_number": score_percentage,
            "skills_matched": list(matching_skills),
            "skills_missing": list(missing_skills),
            "all_skills": all_profile_skills,  
            "linkedin_url": user.linkedin_url or "#",  # Passed seamlessly to UI components
            "angle_offset": (user.id * 73) % 360 
        })
        
    return {"query_requirements": list(req_skills_set), "candidates": candidate_pool}

# =====================================================================
# 3. HACKATHON & COUNTDOWN ENDPOINTS
# =====================================================================

@app.get("/hackathons/active")
def get_active_hackathon(db: Session = Depends(get_db)):
    event = db.query(models.Hackathon).first()
    if not event:
        raise HTTPException(status_code=404, detail="No active events found")
    return {
        "title": event.title,
        "description": event.description,
        "target_date": event.date_string
    }

# =====================================================================
# 4. TEAM INVITATION ROUTING LOGIC
# =====================================================================

@app.post("/invitations/send")
def send_invitation(team_id: int, sender_id: int, receiver_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    sender = db.query(models.User).filter(models.User.id == sender_id).first()
    receiver = db.query(models.User).filter(models.User.id == receiver_id).first()
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender user profile not found")
    if not receiver:
        raise HTTPException(status_code=404, detail="Candidate user profile not found")
        
    new_invite = models.Invitation(
        team_id=team_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        status="PENDING"
    )
    db.add(new_invite)
    db.commit()
    
    # Offloads the email task to run in the background so the frontend client doesn't experience latency
    background_tasks.add_task(
        send_email_notification, 
        receiver_email=receiver.email, 
        receiver_name=receiver.name, 
        sender_name=sender.name
    )
    
    return {"message": f"Invitation sent successfully to {receiver.name}!", "status": "PENDING"}

@app.post("/invitations/{invite_id}/respond")
def respond_to_invitation(invite_id: int, action: str, db: Session = Depends(get_db)):
    invite = db.query(models.Invitation).filter(models.Invitation.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation record not found")
        
    action_upper = action.upper().strip()
    if action_upper not in ["ACCEPTED", "DECLINED"]:
        raise HTTPException(status_code=400, detail="Action must be either 'ACCEPTED' or 'DECLINED'")
        
    invite.status = action_upper
    
    if action_upper == "ACCEPTED":
        team = db.query(models.Team).filter(models.Team.id == invite.team_id).first()
        user = db.query(models.User).filter(models.User.id == invite.receiver_id).first()
        if team and user and (user not in team.members):
            team.members.append(user)
            
    db.commit()
    return {"message": f"Invitation status updated to {action_upper}!", "current_status": invite.status}

@app.get("/users/{user_id}/invitations")
def get_user_invitations(user_id: int, db: Session = Depends(get_db)):
    received = db.query(models.Invitation).filter(models.Invitation.receiver_id == user_id).all()
    sent = db.query(models.Invitation).filter(models.Invitation.sender_id == user_id).all()
    
    return {
        "received_requests": [{"id": i.id, "team_id": i.team_id, "status": i.status} for i in received],
        "sent_requests": [{"id": i.id, "team_id": i.team_id, "status": i.status} for i in sent]
    }

# =====================================================================
# 5. FRONTEND PAGE SERVING (Keep these at the absolute bottom!)
# =====================================================================

@app.get("/")
def read_index():
    return FileResponse("static/index.html")

app.mount("/", StaticFiles(directory="static"), name="static")