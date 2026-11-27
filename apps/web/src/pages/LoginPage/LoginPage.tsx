import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useLogin } from '../../api/auth';
import { ApiError, FORM_MESSAGES } from '../../api/errors';
import { Button } from '../../components/Button/Button';
import { TextInput } from '../../components/TextInput/TextInput';
import { applyApiError } from '../../forms/apply-api-error';
import { loginSchema, type LoginValues } from '../../forms/schemas';
import { routes } from '../../routes';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import styles from './LoginPage.module.scss';
import { FormAlert } from '../../components/FormAlert/FormAlert';

const fieldOrder = ['email', 'password'] as const;

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const titleId = useId();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useLogin();

  const onInvalid = (formErrors: FieldErrors<LoginValues>): void => {
    const first = fieldOrder.find((name) => formErrors[name]);
    if (first) {
      setFocus(first);
    }
  };

  const onSubmit = async (values: LoginValues): Promise<void> => {
    try {
      await login.mutateAsync(values);
      void navigate(routes.app);
    } catch (error) {
      if (error instanceof ApiError) {
        applyApiError(error, setError, setFocus, fieldOrder);
        return;
      }
      setError('root', { message: FORM_MESSAGES.unreachable });
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      titleId={titleId}
      switchPrompt="New here?"
      switchHref={routes.signup}
      switchLabel="Create account"
    >
      <form
        className={styles.form}
        aria-labelledby={titleId}
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit, onInvalid)(event);
        }}
      >
        {errors.root?.message ? (
          <FormAlert
            message={errors.root.message}
            focus={!fieldOrder.some((name) => errors[name])}
          />
        ) : null}
        <TextInput
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextInput
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={login.isPending} loadingLabel="Signing in">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
