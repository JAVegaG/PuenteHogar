'use client';

interface WizardProgressProps {
    currentStep: number;
    steps: string[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
    return (
        <nav aria-label="Progreso del contrato" className="flex items-center justify-center gap-0 mb-6">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                    <div key={label} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                role="listitem"
                                aria-current={isCurrent ? 'step' : undefined}
                                aria-label={`Paso ${stepNumber} de ${steps.length}: ${label}`}
                                className={`flex items-center justify-center w-[36px] h-[36px] min-w-[44px] min-h-[44px] rounded-full text-body font-semibold transition-colors ${isCompleted
                                    ? 'bg-[#16a34a] text-white'
                                    : isCurrent
                                        ? 'bg-[#1d4ed8] text-white'
                                        : 'bg-[#f3f4f6] text-[#4b5563]'
                                    }`}
                            >
                                {isCompleted ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    stepNumber
                                )}
                            </div>
                            <span
                                className={`mt-1 text-small text-center ${isCurrent ? 'font-semibold text-[#1d4ed8]' : 'text-[#4b5563]'
                                    }`}
                            >
                                {label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`w-[40px] h-[2px] mx-2 mb-5 ${stepNumber < currentStep ? 'bg-[#16a34a]' : 'bg-[#d1d5db]'
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
