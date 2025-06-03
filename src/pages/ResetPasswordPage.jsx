// src/pages/ResetPasswordPage.jsx (Nuevo archivo)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';

function ResetPasswordPage() {
  const { token: resetToken } = useParams(); // Obtener el token de la URL
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenIsValid, setTokenIsValid] = useState(null); // null: no verificado, true: válido, false: inválido
  const [verifyingToken, setVerifyingToken] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!resetToken) {
        setError("Token de restablecimiento no encontrado.");
        setTokenIsValid(false);
        setVerifyingToken(false);
        return;
      }
      try {
        setVerifyingToken(true);
        await axios.get(`http://localhost:3001/api/validate-reset-token/${resetToken}`);
        setTokenIsValid(true);
      } catch (err) {
        setError(err.response?.data?.message || "El enlace de restablecimiento es inválido o ha expirado.");
        setTokenIsValid(false);
      } finally {
        setVerifyingToken(false);
      }
    };
    verifyToken();
  }, [resetToken]);

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) { // O tu validación de contraseña
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3001/api/reset-password', {
        token: resetToken,
        newPassword
      });
      Swal.fire({
        title: '¡Éxito!',
        text: response.data.message,
        icon: 'success',
        confirmButtonText: 'Ir a Login'
      }).then(() => {
        navigate('/login');
      });
    } catch (err) {
      setError(err.response?.data?.message || "Error al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="ms-3">Verificando enlace...</p>
      </Container>
    );
  }

  if (!tokenIsValid) {
    return (
      <Container className="mt-5">
        <Card className="mx-auto" style={{ maxWidth: '500px' }}>
          <Card.Body>
            <Card.Title className="text-center mb-4">Enlace Inválido</Card.Title>
            <Alert variant="danger">{error || "Este enlace de restablecimiento de contraseña es inválido o ha expirado."}</Alert>
            <div className="text-center">
              <Button variant="link" onClick={() => navigate('/login')}>Volver a Login</Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body>
          <Card.Title className="text-center mb-4">Establecer Nueva Contraseña</Card.Title>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmitNewPassword}>
            <Form.Group className="mb-3" controlId="newPassword">
              <Form.Label>Nueva Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="confirmNewPassword">
              <Form.Label>Confirmar Nueva Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={loading} className="w-100">
              {loading ? <Spinner as="span" animation="border" size="sm" /> : "Restablecer Contraseña"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ResetPasswordPage;