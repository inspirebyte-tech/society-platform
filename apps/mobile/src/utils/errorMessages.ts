const ERROR_MAP: Record<string, string> = {
  // Auth
  missing_field: 'Please fill in all required fields.',
  invalid_name: 'Name must be at least 2 characters.',
  invalid_phone_format: 'Enter a valid 10-digit mobile number.',
  otp_rate_limit_exceeded: 'Too many attempts. Please try again after an hour.',
  invalid_otp: 'Incorrect OTP. Please check and try again.',
  otp_expired: 'OTP has expired. Please request a new one.',
  otp_not_found: 'No OTP found. Please request a new one.',
  otp_blocked: 'Too many wrong attempts. Please request a new OTP.',
  invalid_refresh_token: 'Session expired. Please log in again.',
  no_token: 'You are not logged in.',
  invalid_token: 'Session expired. Please log in again.',
  token_revoked: 'You have been logged out. Please log in again.',
  user_not_found: 'Account not found.',
  not_a_member: 'You are not a member of this society.',

  // Permissions
  insufficient_permissions: 'You do not have permission to do this.',
  tenant_context_mismatch: 'Something went wrong with your session. Please log in again.',

  // Society
  invalid_type: 'Please select a valid society type.',
  no_fields_provided: 'Please provide at least one field to update.',
  society_not_found: 'Society not found.',

  // Nodes
  invalid_node_type: 'Invalid structure type selected.',
  invalid_parent: 'The selected parent does not exist.',
  duplicate_code: 'This code is already taken. Please use a different one.',
  has_children: 'Remove all units inside this first.',
  has_active_ownership: 'This unit has an active owner. Remove them first.',
  has_active_occupancy: 'This unit has an active occupant. Remove them first.',
  invalid_count: 'Count must be between 1 and 500.',
  node_not_found: 'Structure item not found.',

  // Invitations
  invalid_role: 'Please select a valid role.',
  already_member: 'This person is already a member of the society.',
  invitation_exists: 'An invitation for this number is already pending.',
  already_accepted: 'This invitation has already been accepted.',
  invitation_not_found: 'Invitation not found.',

  // Complaints
  invalid_category: 'Please select a valid category.',
  invalid_visibility: 'Please select a visibility option.',
  too_many_images: 'You can only attach up to 5 images.',
  image_upload_failed: 'Image upload failed. Please try again.',
  already_resolved: 'This complaint is already resolved.',
  already_rejected: 'This complaint is already rejected.',
  rejection_reason_required: 'Please provide a reason for rejection.',
  cannot_resolve_others: 'You can only resolve your own complaints.',
  complaint_not_found: 'Complaint not found.',

  // Units
  already_owner: 'This member already has ownership of this unit.',
  cannot_self_assign_occupied: 'This unit already has an owner. You cannot assign yourself to it.',

  // Members
  invalid_status: 'Invalid status filter.',
  cannot_deactivate_self: 'You cannot remove yourself.',
  cannot_deactivate_builder: 'The builder account cannot be removed.',
  already_inactive: 'This member is already inactive.',
  already_active: 'This member is already active.',
  no_active_occupancy: 'This member has no active unit assignment.',
  member_not_found: 'Member not found.',
}

export function getErrorMessage(code: string): string {
  return ERROR_MAP[code] ?? 'Something went wrong. Please try again.'
}
