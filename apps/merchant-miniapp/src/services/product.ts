import { merchantSupplyService } from './supply'

/** Merchant product flow boundary. Page code never reaches the mock directly. */
export const merchantProductService = {
  getProducts: merchantSupplyService.getGoods,
  getProduct: merchantSupplyService.getGood,
  getQualification: merchantSupplyService.getQualification,
  getCategories: merchantSupplyService.getCategories,
  newProduct: merchantSupplyService.newGood,
  save: merchantSupplyService.saveGoods,
  submit: merchantSupplyService.submitGoods,
  changeSaleStatus: merchantSupplyService.changeSaleStatus,
  reviewDemo: merchantSupplyService.reviewGoodsDemo,
}
