import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useRegister } from '../../api/auth';
import { ApiError, FORM_MESSAGES } from '../../api/errors';
import { Button } from '../../components/Button/Button';
import { TextInput } from '../../components/TextInput/TextInput';
import { applyApiError } from '../../forms/apply-api-error';
import { registerSchema, type RegisterValues } from '../../forms/schemas';
import { routes } from '../../routes';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import styles from './SignupPage.module.scss';
import { FormAlert } from '../../components/FormAlert/FormAlert';

const fieldOrder = ['email', 'username', 'password', 'displayName'] as const;

export function SignupPage(): React.JSX.Element {
  const navigate = useNavigate();
  const titleId = useId();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', username: '', password: '', displayName: '' },
  });

  const registerAccount = useRegister();

  const onInvalid = (formErrors: FieldErrors<RegisterValues>): void => {
    const first = fieldOrder.find((name) => formErrors[name]);
    if (first) {
      setFocus(first);
    }
  };

  const onSubmit = async (values: RegisterValues): Promise<void> => {
    try {
      await registerAccount.mutateAsync({
        email: values.email,
        username: values.username,
        password: values.password,
        displayName: values.displayName || undefined,
      });
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
      title="Create account"
      titleId={titleId}
      switchPrompt="Already playing?"
      switchHref={routes.login}
      switchLabel="Sign in"
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
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextInput
          id="signup-username"
          label="Username"
          type="text"
          autoComplete="username"
          hint="3–32 lowercase letters, numbers, or underscores."
          error={errors.username?.message}
          {...register('username')}
        />
        <TextInput
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextInput
          id="signup-display-name"
          label="Display name"
          type="text"
          autoComplete="nickname"
          hint="Optional. Shown to other players."
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Button
          type="submit"
          loading={registerAccount.isPending}
          loadingLabel="Creating account"
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
