import type {
  BusinessQualificationData,
  CooperationStatusData,
  EntityStatus,
  MerchantCooperationService,
  MerchantStaffRecord,
  MerchantStoreRecord,
  OperatorApplication,
  OperatorProfile,
  QualificationRecord,
} from '../../common/types/merchant-cooperation'

const resolveMock = async <T>(value: T): Promise<T> => Promise.resolve(JSON.parse(JSON.stringify(value)) as T)

let application: OperatorApplication = {
  id: 'application-001', projectId: 'project-daguanglu', projectName: '大光路智慧社区（秦淮区）', status: 'approved', currentStep: 4,
  subjectType: 'individual-business', subjectName: '南京邻里生鲜商店', creditCode: '92320104MA27XXXXXX', legalRepresentative: '王建国', registeredAddress: '南京市秦淮区大光路街道',
  contactName: '王建国', contactMobile: '13800005821', businessLicenseFiles: ['营业执照副本.jpg'], firstStoreName: '邻里生鲜（大光路店）', storeAddress: '秦淮区大光路138号', businessHours: '07:00-21:30',
  businessTypes: ['商城'], categories: ['生鲜果蔬', '米面粮油'], otherQualificationFiles: ['食品经营许可证.jpg'], savedAt: '2026-09-04 11:20', submittedAt: '2026-09-04 11:30', reviewedAt: '2026-09-05 09:18', reviewOpinion: '主体资料完整，准予入驻。',
}

const applicationHistory = [
  { id: 'history-003', title: '审核通过', description: '主体资料完整，准予入驻。', occurredAt: '2026-09-05 09:18', tone: 'success' as const },
  { id: 'history-002', title: '提交审核', description: '提交主体、门店及资质材料', occurredAt: '2026-09-04 11:30', tone: 'pending' as const },
  { id: 'history-001', title: '保存草稿', description: '完成入驻资料填写', occurredAt: '2026-09-04 11:20', tone: 'disabled' as const },
]

let operatorProfile: OperatorProfile = {
  id: 'operator-linli', code: 'OP20260905001', subjectType: '个体工商户', subjectName: '南京邻里生鲜商店', creditCodeMasked: '92320104MA27****XX', legalRepresentativeMasked: '王**', registeredAddress: '南京市秦淮区大光路街道', contactName: '王建国', contactMobile: '13800005821', status: 'normal', createdAt: '2026-09-05 09:18',
}

let stores: MerchantStoreRecord[] = [
  { id: 'store-daguanglu', operatorId: 'operator-linli', name: '邻里生鲜（大光路店）', address: '秦淮区大光路138号', contactName: '王建国', contactMobileMasked: '138****5821', contactMobile: '13800005821', businessHours: '07:00-21:30', status: 'active', isPrimary: true },
  { id: 'store-biaoying', operatorId: 'operator-linli', name: '邻里生鲜（标营店）', address: '秦淮区标营路28号', contactName: '李敏', contactMobileMasked: '139****1266', contactMobile: '13900001266', businessHours: '08:00-20:30', status: 'disabled', isPrimary: false },
]

let staff: MerchantStaffRecord[] = [
  { id: 'staff-owner', operatorId: 'operator-linli', memberName: '王建国', mobileMasked: '138****5821', mobile: '13800005821', role: 'owner', storeIds: [], storeScopeLabel: '全部有效门店', status: 'active', joinedAt: '2026-09-05 09:18' },
  { id: 'staff-worker', operatorId: 'operator-linli', memberName: '李敏', mobileMasked: '139****1266', mobile: '13900001266', role: 'worker', storeIds: ['store-daguanglu'], storeScopeLabel: '邻里生鲜（大光路店）', status: 'active', joinedAt: '2026-09-06 10:20' },
  { id: 'staff-service', operatorId: 'operator-linli', memberName: '周师傅', mobileMasked: '137****9302', mobile: '13700009302', role: 'service', storeIds: ['store-biaoying'], storeScopeLabel: '邻里生鲜（标营店）', status: 'disabled', joinedAt: '2026-09-08 15:40' },
]

let qualifications: QualificationRecord[] = [
  { id: 'qualification-license', operatorId: 'operator-linli', holderType: 'operator', holderName: '南京邻里生鲜商店', type: '营业执照', certificateNo: '92320104MA27XXXXXX', certificateNoMasked: '92320104MA27****XX', effectiveDate: '2024-01-01', expiryDate: '长期', businessTypes: ['商城', '社区服务'], categories: [], files: ['营业执照副本.jpg'], status: 'valid', reviewStatus: 'approved', updatedAt: '2026-09-05 09:18' },
  { id: 'qualification-food', operatorId: 'operator-linli', holderType: 'operator', holderName: '南京邻里生鲜商店', type: '食品经营许可证', certificateNo: 'JY13201040000001', certificateNoMasked: 'JY132010****0001', effectiveDate: '2024-10-01', expiryDate: '2026-10-01', businessTypes: ['商城'], categories: ['生鲜果蔬', '米面粮油'], files: ['食品经营许可证.jpg'], status: 'expiring', reviewStatus: 'approved', reason: '证照将在 30 天内到期，请及时更新。', updatedAt: '2026-09-10 08:00' },
  { id: 'qualification-health', operatorId: 'operator-linli', holderType: 'staff', holderName: '李敏', type: '从业人员健康证', certificateNo: 'JK2025000188', certificateNoMasked: 'JK2025****0188', effectiveDate: '2025-09-01', expiryDate: '2026-09-01', businessTypes: ['商城'], categories: ['生鲜果蔬'], files: ['健康证.jpg'], status: 'expired', reviewStatus: 'approved', reason: '证照已过期，更新并经平台确认后恢复生效。', updatedAt: '2026-09-01 00:00' },
]

const cooperationStatus: CooperationStatusData = {
  project: { id: 'project-daguanglu', name: '大光路智慧社区（秦淮区）', status: '启用' },
  agreement: { name: '大光路智慧社区商户入驻协议', no: 'XY-DGL-2026-0018', status: '有效', period: '2026-09-05 至 2027-09-04', scope: '社区商城及已授权经营类目' },
  cooperation: { status: '合作中', period: '2026-09-05 至 2027-09-04' },
  authorizations: [
    { id: 'auth-mall', businessType: '商城', categories: ['生鲜果蔬', '米面粮油'], storeScope: '全部有效门店', period: '2026-09-05 至 2027-09-04', status: '有效' },
    { id: 'auth-service', businessType: '社区服务', categories: ['家电清洗'], storeScope: '大光路店', period: '2026-09-05 至 2027-03-31', status: '待生效' },
  ],
}

const businessQualification: BusinessQualificationData = {
  projectName: '大光路智慧社区（秦淮区）',
  business: {
    status: 'valid', description: '主体、必要资质、合作协议、项目合作和经营授权均满足当前经营条件。',
    scopes: [
      { businessType: '商城', canMaintain: true, categories: ['生鲜果蔬', '米面粮油'] },
      { businessType: '社区服务', canMaintain: true, categories: ['家电清洗'] },
    ],
    checks: [
      { label: '主体状态', status: 'passed', description: '正常（主体资质已过审）', actionText: '查看资料', actionPath: '/pages/profile/basic/index' },
      { label: '必要资质', status: 'passed', description: '有效（食品经营许可已核验）', actionText: '查看资质', actionPath: '/pages/qualifications/index' },
      { label: '合作协议', status: 'passed', description: '有效（商户入驻协议履约中）', actionText: '合作状态', actionPath: '/pages/cooperation/status/index' },
      { label: '项目合作', status: 'passed', description: '合作中（已关联当前项目）' },
      { label: '经营授权', status: 'passed', description: '商城授权有效' },
    ],
  },
  fund: { status: 'configuring', description: '平台正在配置资金结算通道，预计完成后通知。', updatedAt: '2026-09-15 16:30' },
  formalTrade: {
    status: 'unavailable', description: '业务经营资格有效，可维护经营内容；资金接入尚未完成，暂不可正式收款。',
    checks: [
      { label: '业务经营资格', status: 'passed', description: '符合' },
      { label: '资金接入状态', status: 'pending', description: '配置中' },
      { label: '必要分账关系', status: 'pending', description: '待资金接入完成后确认' },
    ],
  },
  checkedAt: '2026-09-16 09:30',
}

const findOrNewId = (id: string, prefix: string) => id || `${prefix}-${Date.now()}`

export const merchantCooperationMockAdapter: MerchantCooperationService = {
  getApplication: () => resolveMock({ application, history: applicationHistory }),
  saveApplication: async (input) => {
    if (!['draft', 'rejected'].includes(application.status)) throw new Error('申请审核中或已通过，暂不可修改')
    application = { ...input, id: application.id, status: application.status, savedAt: '刚刚' }
    return resolveMock(application)
  },
  submitApplication: async (input) => {
    if (!['draft', 'rejected'].includes(application.status)) throw new Error('申请状态已变化，请刷新后重试')
    if (!input.subjectName || !input.contactName || !input.firstStoreName || !input.businessLicenseFiles.length) throw new Error('请完成全部必填资料后再提交')
    application = { ...input, id: application.id, status: 'pending', currentStep: 4, submittedAt: '刚刚', savedAt: '刚刚' }
    return resolveMock(application)
  },
  getOperatorProfile: () => resolveMock(operatorProfile),
  updateOperatorProfile: async (input) => {
    operatorProfile = { ...operatorProfile, ...input }
    return resolveMock(operatorProfile)
  },
  listStores: () => resolveMock(stores),
  getStore: (id) => resolveMock(stores.find((item) => item.id === id) || null),
  saveStore: async (input) => {
    const record = { ...input, id: findOrNewId(input.id, 'store'), operatorId: 'operator-linli', contactMobileMasked: input.contactMobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
    const index = stores.findIndex((item) => item.id === record.id)
    if (index >= 0) stores[index] = record
    else stores.unshift(record)
    return resolveMock(record)
  },
  setStoreStatus: async (id: string, status: EntityStatus) => { stores = stores.map((item) => item.id === id ? { ...item, status } : item) },
  listStaff: () => resolveMock(staff),
  getStaff: (id) => resolveMock(staff.find((item) => item.id === id) || null),
  saveStaff: async (input) => {
    const record = { ...input, id: findOrNewId(input.id, 'staff'), operatorId: 'operator-linli', mobileMasked: input.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
    const index = staff.findIndex((item) => item.id === record.id)
    if (index >= 0) staff[index] = record
    else staff.unshift(record)
    return resolveMock(record)
  },
  setStaffStatus: async (id: string, status: EntityStatus) => {
    const activeOwners = staff.filter((item) => item.role === 'owner' && item.status === 'active')
    const target = staff.find((item) => item.id === id)
    if (target?.role === 'owner' && status === 'disabled' && activeOwners.length <= 1) throw new Error('最后一名有效负责人不能直接停用，请先转交负责人')
    staff = staff.map((item) => item.id === id ? { ...item, status } : item)
  },
  transferOwner: async (id: string) => {
    const target = staff.find((item) => item.id === id)
    if (!target || target.status !== 'active') throw new Error('只能向已确认加入且在职的人员转交负责人')
    staff = staff.map((item) => item.id === id ? { ...item, role: 'owner' } : item.role === 'owner' ? { ...item, role: 'worker' } : item)
  },
  listQualifications: () => resolveMock(qualifications),
  getQualification: (id) => resolveMock(qualifications.find((item) => item.id === id) || null),
  saveQualification: async (input) => {
    const record = { ...input, id: findOrNewId(input.id, 'qualification'), operatorId: 'operator-linli', certificateNoMasked: input.certificateNo.replace(/^(.{4}).*(.{4})$/, '$1****$2'), status: 'pending' as const, reviewStatus: 'pending' as const, reason: '资料已提交，平台确认后生效。', updatedAt: '刚刚' }
    const index = qualifications.findIndex((item) => item.id === record.id)
    if (index >= 0) qualifications[index] = record
    else qualifications.unshift(record)
    return resolveMock(record)
  },
  getCooperationStatus: () => resolveMock(cooperationStatus),
  getBusinessQualification: () => resolveMock(businessQualification),
}
