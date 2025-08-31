// Export all table columns from separate files
export { columns, type SalesPerson } from "./salesPersonColumns";
export {
  outstandingPaymentsColumns,
  type OutstandingPayment,
} from "./outstandingPaymentsColumns";
export { agentPayoutsColumns, type AgentPayout } from "./agentPayoutsColumns";

// Export shared utilities
export { money, formatPercent } from "./tableUtils";
