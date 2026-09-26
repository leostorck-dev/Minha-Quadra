import { ForbiddenError, UnauthorizedError } from "@/lib/auth/context";
import { CustomerNotFoundError } from "@/features/customers/service";
import { CourtNotFoundError } from "@/features/courts/service";
import {
  ReservationConflictError,
  ReservationNotFoundError,
} from "@/features/reservations/service";
import { ValidationError } from "@/lib/api/validation-error";
import { PaymentConflictError } from "@/features/payments/service";
import { ClassPaymentConflictError } from "@/features/class-payments/service";
import { CoachCommissionConflictError } from "@/features/coach-commissions/service";
import {
  TournamentConflictError,
  TournamentNotFoundError,
} from "@/features/tournaments/service";
import {
  FinancialConflictError,
  FinancialNotFoundError,
} from "@/features/finance/service";
import {
  MembershipConflictError,
  MembershipNotFoundError,
} from "@/features/memberships/service";
import {
  ClassConflictError,
  ClassNotFoundError,
} from "@/features/classes/service";

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function apiError(error: unknown) {
  if (error instanceof TournamentConflictError) {
    return privateJson(
      { error: { code: "TOURNAMENT_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof CoachCommissionConflictError) {
    return privateJson(
      { error: { code: "COACH_COMMISSION_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof ClassPaymentConflictError) {
    return privateJson(
      { error: { code: "CLASS_PAYMENT_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof ClassConflictError) {
    return privateJson(
      { error: { code: "CLASS_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof MembershipConflictError) {
    return privateJson(
      { error: { code: "MEMBERSHIP_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof FinancialConflictError) {
    return privateJson(
      { error: { code: "FINANCIAL_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof PaymentConflictError) {
    return privateJson(
      { error: { code: "PAYMENT_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof ReservationConflictError) {
    return privateJson(
      { error: { code: "RESERVATION_CONFLICT", message: error.message } },
      409,
    );
  }
  if (error instanceof ValidationError || error instanceof SyntaxError) {
    return privateJson(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof ValidationError ? error.message : "JSON inválido.",
        },
      },
      400,
    );
  }
  if (error instanceof UnauthorizedError) {
    return privateJson(
      { error: { code: "UNAUTHORIZED", message: error.message } },
      401,
    );
  }
  if (error instanceof ForbiddenError) {
    return privateJson(
      { error: { code: "FORBIDDEN", message: error.message } },
      403,
    );
  }
  if (
    error instanceof CustomerNotFoundError ||
    error instanceof CourtNotFoundError ||
    error instanceof ReservationNotFoundError ||
    error instanceof FinancialNotFoundError ||
    error instanceof MembershipNotFoundError ||
    error instanceof ClassNotFoundError ||
    error instanceof TournamentNotFoundError
  ) {
    return privateJson(
      { error: { code: "NOT_FOUND", message: error.message } },
      404,
    );
  }
  return privateJson(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Não foi possível concluir a operação.",
      },
    },
    500,
  );
}
