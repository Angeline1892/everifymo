# backend/app/core/constants.py
class Role:
    SUPERADMIN = "superadmin"
    FDA_PERSONNEL = "fda_personnel"
    LEA_PERSONNEL = "lea_personnel"


class UserStatus:
    INVITED = "invited"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"

    #to be worked on later, optional
    REJECTED = "rejected"
    RETURNED = "returned"


# Which complaint statuses are allowed to move to which other
# statuses, per source. Prevents accidentally skipping steps (e.g.
# jumping straight from 'open' to 'completed') or moving a complaint
# somewhere it can never leave (like 'dismissed' -> anything).
VALID_COMPLAINT_TRANSITIONS = {
    "extension": {
        "open": ["under_review", "dismissed"],
        "under_review": ["takedown_requested", "dismissed"],
        "takedown_requested": ["completed", "dismissed"],
        "completed": [],
        "dismissed": [],
    },
    "walk_in": {
        "open": ["under_review", "dismissed"],
        "under_review": ["takedown_requested", "dismissed", "open"], #added "open", so recalling a verification request can send the complaint back to Ready to Send
        "takedown_requested": ["takedown_initiated", "dismissed"],
        "takedown_initiated": ["completed", "dismissed"],
        "completed": [],
        "dismissed": [],
    },
}

class AuditAction:
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    UPDATE_COMPLAINT_STATUS = "UPDATE_COMPLAINT_STATUS"
    UPDATE_VERIFICATION_STATUS = "UPDATE_VERIFICATION_STATUS"
    CREATE_REGISTERED_PRODUCT = "CREATE_REGISTERED_PRODUCT"
    CONVERT_TO_REGISTERED_PRODUCT = "CONVERT_TO_REGISTERED_PRODUCT"
    UPDATE_REGISTERED_PRODUCT = "UPDATE_REGISTERED_PRODUCT"
    DELETE_REGISTERED_PRODUCT = "DELETE_REGISTERED_PRODUCT"
    CREATE_UNREGISTERED_ADVISORY = "CREATE_UNREGISTERED_ADVISORY"
    CONVERT_TO_UNREGISTERED_ADVISORY = "CONVERT_TO_UNREGISTERED_ADVISORY"
    UPDATE_UNREGISTERED_ADVISORY = "UPDATE_UNREGISTERED_ADVISORY"
    DELETE_UNREGISTERED_ADVISORY = "DELETE_UNREGISTERED_ADVISORY"
    UPDATE_USER_PROFILE = "UPDATE_USER_PROFILE" #wala to sa superadmin
    UPDATE_USER_PASSWORD = "UPDATE_USER_PASSWORD" #ok na sa superadmin
    UPDATE_SUPERADMIN_PASSWORD = "UPDATE_SUPERADMIN_PASSWORD" #ok na rin sa superadmin

    # Personnel (FDA/LEA) account management — Superadmin acting on personnel
    INVITE_PERSONNEL = "INVITE_PERSONNEL"
    PERSONNEL_REQUEST_INVITE = "PERSONNEL_REQUEST_INVITE"
    INVITE_PERSONNEL_RESENT = "INVITE_PERSONNEL_RESENT"
    APPROVE_PERSONNEL_ACCOUNT = "APPROVE_PERSONNEL_ACCOUNT"
    SUSPEND_PERSONNEL_ACCOUNT = "SUSPEND_PERSONNEL_ACCOUNT"
    REACTIVATE_PERSONNEL_ACCOUNT = "REACTIVATE_PERSONNEL_ACCOUNT"
    DELETE_PERSONNEL_ACCOUNT = "DELETE_PERSONNEL_ACCOUNT"
    UNLOCK_PERSONNEL_ACCOUNT = "UNLOCK_PERSONNEL_ACCOUNT"

    # Superadmin account management — Superadmin acting on other superadmins
    INVITE_SUPERADMIN = "INVITE_SUPERADMIN" #ok
    INVITE_SUPERADMIN_RESENT = "INVITE_SUPERADMIN_RESENT" #ok
    SUPERADMIN_REQUEST_INVITE = "SUPERADMIN_REQUEST_INVITE" #after 2 days k plang matest kasi doon pa lang ma expired yung link
    APPROVE_SUPERADMIN_ACCOUNT = "APPROVE_SUPERADMIN_ACCOUNT"
    SUSPEND_SUPERADMIN_ACCOUNT = "SUSPEND_SUPERADMIN_ACCOUNT"
    REACTIVATE_SUPERADMIN_ACCOUNT = "REACTIVATE_SUPERADMIN_ACCOUNT"
    DELETE_SUPERADMIN_ACCOUNT = "DELETE_SUPERADMIN_ACCOUNT"
    UNLOCK_SUPERADMIN_ACCOUNT = "UNLOCK_SUPERADMIN_ACCOUNT"

    # SUPERADMIN_PENDING_APPROVAL is used when a superadmin account is created and is awaiting approval from another superadmin. This action is logged when the account is created and set to pending approval status.

    # LEA-CIDG actions
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    CREATE_COMPLAINT_LOG = "CREATE_COMPLAINT_LOG"
    DELETE_COMPLAINT_LOG = "DELETE_COMPLAINT_LOG"
    UPDATE_COMPLAINT_LOG = "UPDATE_COMPLAINT_LOG"
    DELETE_VERIFICATION_REQUEST = "DELETE_VERIFICATION_REQUEST"
    CREATE_VERIFICATION_REQUEST = "CREATE_VERIFICATION_REQUEST"
    UPDATE_COMPLAINT_STATUS = "UPDATE_COMPLAINT_STATUS"

    # System actions
    LOCK_PERSONNEL_ACCOUNT = "LOCK_PERSONNEL_ACCOUNT"
    LOCK_SUPERADMIN_ACCOUNT = "LOCK_SUPERADMIN_ACCOUNT"
    SUPERADMIN_PENDING_APPROVAL = "SUPERADMIN_PENDING_APPROVAL" #this is for system tab since automatic action
    PERSONNEL_PENDING_APPROVAL = "PERSONNEL_PENDING_APPROVAL"
