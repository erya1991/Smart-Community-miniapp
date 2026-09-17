export type ApplicationStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type EntityStatus = 'active' | 'disabled'
export type StaffRole = 'owner' | 'worker' | 'service'
export type QualificationStatus = 'pending' | 'valid' | 'expiring' | 'expired' | 'invalid'

export interface OperatorApplication {
  id: string
  projectId: string
  projectName: string
  status: ApplicationStatus
  currentStep: number
  subjectType: 'enterprise' | 'individual-business'
  subjectName: string
  creditCode: string
  legalRepresentative: string
  registeredAddress: string
  contactName: string
  contactMobile: string
  businessLicenseFiles: string[]
  firstStoreName: string
  storeAddress: string
  businessHours: string
  businessTypes: string[]
  categories: string[]
  otherQualificationFiles: string[]
  savedAt: string
  submittedAt?: string
  reviewedAt?: string
  reviewOpinion?: string
  rejectionReason?: string
}

export interface ApplicationHistoryItem {
  id: string
  title: string
  description: string
  occurredAt: string
  tone: 'success' | 'pending' | 'error' | 'disabled'
}

export interface OperatorProfile {
  id: string
  code: string
  subjectType: string
  subjectName: string
  creditCodeMasked: string
  legalRepresentativeMasked: string
  registeredAddress: string
  contactName: string
  contactMobile: string
  status: 'normal' | 'suspended' | 'exited'
  statusReason?: string
  createdAt: string
}

export interface MerchantStoreRecord {
  id: string
  operatorId: string
  name: string
  address: string
  contactName: string
  contactMobileMasked: string
  contactMobile: string
  businessHours: string
  status: EntityStatus
  isPrimary: boolean
}

export interface MerchantStaffRecord {
  id: string
  operatorId: string
  memberName: string
  mobileMasked: string
  mobile: string
  role: StaffRole
  storeIds: string[]
  storeScopeLabel: string
  status: EntityStatus
  joinedAt: string
}

export interface QualificationRecord {
  id: string
  operatorId: string
  holderType: 'operator' | 'staff'
  holderName: string
  type: string
  certificateNo: string
  certificateNoMasked: string
  effectiveDate: string
  expiryDate: string
  businessTypes: string[]
  categories: string[]
  files: string[]
  status: QualificationStatus
  reviewStatus: 'pending' | 'approved' | 'rejected'
  reason?: string
  updatedAt: string
}

export interface CooperationStatusData {
  project: { id: string; name: string; status: string }
  agreement: { name: string; no: string; status: string; period: string; scope: string }
  cooperation: { status: string; period: string; reason?: string }
  authorizations: Array<{ id: string; businessType: string; categories: string[]; storeScope: string; period: string; status: string }>
}

export interface QualificationCheck {
  label: string
  status: 'passed' | 'pending' | 'failed'
  description: string
  actionText?: string
  actionPath?: string
}

export interface BusinessQualificationData {
  projectName: string
  business: {
    status: 'valid' | 'invalid'
    description: string
    scopes: Array<{ businessType: string; canMaintain: boolean; categories: string[] }>
    checks: QualificationCheck[]
  }
  fund: {
    status: 'unconfigured' | 'configuring' | 'ready' | 'exception'
    description: string
    updatedAt: string
  }
  formalTrade: {
    status: 'available' | 'unavailable'
    description: string
    checks: QualificationCheck[]
  }
  checkedAt: string
}

export interface MerchantCooperationPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDisable: boolean
  canTransferOwner: boolean
}

export interface MerchantCooperationService {
  getApplication(): Promise<{ application: OperatorApplication; history: ApplicationHistoryItem[] }>
  saveApplication(application: OperatorApplication): Promise<OperatorApplication>
  submitApplication(application: OperatorApplication): Promise<OperatorApplication>
  getOperatorProfile(): Promise<OperatorProfile>
  updateOperatorProfile(input: Pick<OperatorProfile, 'contactName' | 'contactMobile' | 'registeredAddress'>): Promise<OperatorProfile>
  listStores(): Promise<MerchantStoreRecord[]>
  getStore(id?: string): Promise<MerchantStoreRecord | null>
  saveStore(input: MerchantStoreRecord): Promise<MerchantStoreRecord>
  setStoreStatus(id: string, status: EntityStatus): Promise<void>
  listStaff(): Promise<MerchantStaffRecord[]>
  getStaff(id?: string): Promise<MerchantStaffRecord | null>
  saveStaff(input: MerchantStaffRecord): Promise<MerchantStaffRecord>
  setStaffStatus(id: string, status: EntityStatus): Promise<void>
  transferOwner(id: string): Promise<void>
  listQualifications(): Promise<QualificationRecord[]>
  getQualification(id?: string): Promise<QualificationRecord | null>
  saveQualification(input: QualificationRecord): Promise<QualificationRecord>
  getCooperationStatus(): Promise<CooperationStatusData>
  getBusinessQualification(): Promise<BusinessQualificationData>
}
