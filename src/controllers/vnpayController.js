import querystring from "qs";
import crypto from "crypto";
import moment from "moment";
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}
export const createPayment = (req, res, next) => {
  let tmnCode = process.env.VNPAY_TMNCODE;
  let vnp_HashSecret = process.env.VNPAY_HASHSECRET;
  let vnpUrl = process.env.VNPAY_URL;
  let returnUrl = process.env.VNPAY_RETURNURL;

  const ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  console.log(">>>ipAddr: " + ipAddr);
  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");
  const orderId = moment(date).format("DDHHmmss");
  const amount = req.body.orderData.totalAmount;
  const bankCode = req.body.orderData.bankCode;

  const orderInfo = req.body.orderData.orderDescription;
  const locale = req.body.language || "vn";
  const currCode = "VND";
  let vnp_Params = {};

  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = orderInfo;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = "13.160.92.202";
  vnp_Params["vnp_CreateDate"] = createDate;
  if (bankCode !== null && bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }
  console.log(">>>check vnp_Param: ", vnp_Params);

  vnp_Params = sortObject(vnp_Params);
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", vnp_HashSecret);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;
  const vnpayUrl =
    vnpUrl + "?" + querystring.stringify(vnp_Params, { encode: false });

  res.status(200).json({
    vnpayUrl,
  });
};
