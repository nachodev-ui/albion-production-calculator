import { useContext } from "react";
import { AccountSessionContext } from "../context/accountSession";
import type { AccountSessionValue } from "../context/accountSession";

export function useAccountSession(): AccountSessionValue {
  return useContext(AccountSessionContext);
}
