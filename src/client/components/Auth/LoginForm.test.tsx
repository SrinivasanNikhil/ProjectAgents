import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../hooks/useAuth';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    (global.fetch as any).mockReset();
  });

  const renderWithProvider = () =>
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

  it('renders and submits login', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'jwt-token',
          user: {
            id: 'u1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'student'
          }
        }
      }),
    });

    renderWithProvider();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/login successful/i));
  });

  it('shows error on failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'Invalid credentials' }),
    });

    renderWithProvider();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i));
  });
});