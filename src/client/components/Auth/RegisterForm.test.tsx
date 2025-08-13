import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../hooks/useAuth';
import RegisterForm from './RegisterForm';

describe('RegisterForm', () => {
  beforeEach(() => {
    (global.fetch as any).mockReset();
  });

  const renderWithProvider = () =>
    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

  it('renders and submits registration', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'jwt-token',
          user: {
            id: 'u1', email: 'reg@example.com', firstName: 'Reg', lastName: 'User', role: 'student'
          }
        }
      }),
    });

    renderWithProvider();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'reg@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Reg' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'student' } });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/registration successful/i));
  });

  it('shows error on failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'User exists' }),
    });

    renderWithProvider();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'exists@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ex' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Ist' } });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/user exists/i));
  });
});