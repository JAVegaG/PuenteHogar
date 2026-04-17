interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <nav
      role="navigation"
      aria-label={`Paso ${currentStep} de ${totalSteps}`}
      className="flex items-center justify-center"
    >
      {steps.map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isPending = step > currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center justify-center rounded-full text-caption font-semibold
                w-[3.2rem] h-[3.2rem] shrink-0
                ${isCompleted ? 'bg-primary text-white' : ''}
                ${isCurrent ? 'bg-primary text-white' : ''}
                ${isPending ? 'bg-neutral-100 text-neutral-600' : ''}
              `}
            >
              {isCompleted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-[1.6rem] h-[1.6rem]"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step
              )}
            </div>

            {/* Connector line (not after last step) */}
            {step < totalSteps && (
              <div
                className={`w-[4rem] h-[0.2rem] mx-[0.4rem] ${
                  step < currentStep ? 'bg-primary' : 'bg-neutral-100'
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
