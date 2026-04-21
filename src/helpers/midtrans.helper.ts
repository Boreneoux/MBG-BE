import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger.config';
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_IS_PRODUCTION,
  MIDTRANS_SNAP_URL,
  MIDTRANS_API_URL,
} from '../config/main.config';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MidtransTransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface MidtransCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface CreateTransactionParams {
  order_id: string;
  order_number: string;
  gross_amount: number;
  customer: MidtransCustomer;
  items: MidtransTransactionItem[];
  callback_url?: string;
}

interface MidtransTransactionResponse {
  token: string;
  redirect_url: string;
  transaction_id: string;
  status_code: string;
  status_message: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const getMidtransConfig = () => ({
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
  isProduction: MIDTRANS_IS_PRODUCTION,
  snapUrl: MIDTRANS_SNAP_URL,
  apiUrl: MIDTRANS_API_URL,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeader(): string {
  const config = getMidtransConfig();
  const auth = Buffer.from(config.serverKey + ':').toString('base64');
  return `Basic ${auth}`;
}

export function generateSignatureKey(
  orderId: string,
  statusCode: string,
  grossAmount: string
): string {
  const config = getMidtransConfig();
  const data = orderId + statusCode + grossAmount + config.serverKey;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const expectedSignature = generateSignatureKey(orderId, statusCode, grossAmount);
  return expectedSignature === signatureKey;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

export async function createSnapTransaction(
  params: CreateTransactionParams
): Promise<MidtransTransactionResponse> {
  const config = getMidtransConfig();

  if (!config.serverKey || !config.clientKey) {
    throw new Error('Midtrans server key or client key is not configured');
  }

  const payload: Record<string, unknown> = {
    transaction_details: {
      order_id: params.order_id,
      gross_amount: Math.round(params.gross_amount),
    },
    customer_details: {
      first_name: params.customer.first_name || '',
      last_name: params.customer.last_name || '',
      email: params.customer.email || '',
      phone: params.customer.phone || '',
    },
    item_details: params.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Math.round(item.price),
      quantity: item.quantity,
    })),
  };

  if (params.callback_url) {
    payload.callback_url = params.callback_url;
  }

  try {
    logger.info(`Creating Midtrans transaction for order: ${params.order_number}`);
    const response = await axios.post<MidtransTransactionResponse>(
      `${config.snapUrl}/transactions`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
      }
    );
    logger.info(`Midtrans transaction created: ${response.data.transaction_id}`);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to create Midtrans transaction', {
      error: error.message,
      data: error.response?.data,
    });
    throw new Error(`Failed to create payment transaction: ${error.message}`);
  }
}

export async function getTransactionStatus(orderId: string): Promise<any> {
  const config = getMidtransConfig();
  try {
    const response = await axios.get(
      `${config.apiUrl}/v2/${orderId}/status`,
      { headers: { Authorization: getAuthHeader() } }
    );
    return response.data;
  } catch (error: any) {
    logger.error('Failed to get Midtrans transaction status', {
      error: error.message,
      data: error.response?.data,
    });
    throw new Error(`Failed to get transaction status: ${error.message}`);
  }
}

export function mapMidtransStatus(transactionStatus: string):
  'waiting_for_payment' | 'processing' | 'cancelled' {
  switch (transactionStatus) {
    case 'capture':
    case 'settlement':
      return 'processing';
    case 'pending':
      return 'waiting_for_payment';
    case 'expire':
    case 'cancel':
    case 'deny':
      return 'cancelled';
    default:
      return 'waiting_for_payment';
  }
}

export function isFinalStatus(transactionStatus: string): boolean {
  return ['settlement', 'expire', 'cancel', 'deny'].includes(transactionStatus);
}