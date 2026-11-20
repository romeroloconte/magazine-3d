"use client";

import { useActionState, useState } from "react";
import { login } from "../actions";
import { Icon } from "../Icon";

export default function Login() {
  const [state, action, pending] = useActionState(login, undefined);
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="admin-login">
      <h1>magazine web</h1>
      <div className="password-field">
        <label htmlFor="password">Password</label>
        <div className="password">
          <input id="password" type={visible ? "text" : "password"} name="password"
            autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
          <button type="button" className="toggle-password" onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
            <Icon name={visible ? "eyeOff" : "eye"} size={20} />
          </button>
        </div>
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
