'use client'

import {Carousel as AntCarousel} from 'antd';
import type {CarouselProps as AntCarouselProps} from 'antd';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/inputs/button';
import {cn} from '@/lib/utils';

// Define a type for the Carousel API that's compatible with the original
type CarouselApi = {
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: () => boolean;
    canScrollNext: () => boolean;
    on: (event: string, callback: (api: any) => void) => void;
    off: (event: string, callback: (api: any) => void) => void;
};

// Define props that match the original component's API
type CarouselProps = {
    opts?: Record<string, any>;
    plugins?: any;
    orientation?: 'horizontal' | 'vertical';
    setApi?: (api: CarouselApi) => void;
};

// Context props to share state between components
type CarouselContextProps = {
    carouselRef: React.RefObject<HTMLDivElement | null>;
    api: CarouselApi | null;
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
    const context = React.useContext(CarouselContext);

    if (!context) {
        throw new Error('useCarousel must be used within a <Carousel />');
    }

    return context;
}

const Carousel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
    (
        {
            orientation = 'horizontal',
            opts,
            setApi,
            plugins,
            className,
            children,
            ...props
        },
        ref
    ) => {
        const carouselRef = React.useRef<HTMLDivElement>(null);
        const antCarouselRef = React.useRef<any>(null);
        const [canScrollPrev, setCanScrollPrev] = React.useState(false);
        const [canScrollNext, setCanScrollNext] = React.useState(true);
        const [currentSlide, setCurrentSlide] = React.useState(0);
        const [totalSlides, setTotalSlides] = React.useState(0);

        // Count the number of CarouselItem children
        React.useEffect(() => {
            if (React.Children.count(children) > 0) {
                // Find CarouselContent and count its children
                React.Children.forEach(children, (child) => {
                    if (React.isValidElement(child) && child.type === CarouselContent) {
                        const childProps = child.props as { children?: React.ReactNode };
                        setTotalSlides(React.Children.count(childProps.children));
                    }
                });
            }
        }, [children]);

        // Update navigation state based on current slide
        React.useEffect(() => {
            setCanScrollPrev(currentSlide > 0);
            setCanScrollNext(currentSlide < totalSlides - 1);
        }, [currentSlide, totalSlides]);

        // Create a compatible API for the original component
        const api: CarouselApi = React.useMemo(() => ({
            scrollPrev: () => {
                if (antCarouselRef.current) {
                    antCarouselRef.current.prev();
                    setCurrentSlide((prev) => Math.max(0, prev - 1));
                }
            },
            scrollNext: () => {
                if (antCarouselRef.current) {
                    antCarouselRef.current.next();
                    setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1));
                }
            },
            canScrollPrev: () => currentSlide > 0,
            canScrollNext: () => currentSlide < totalSlides - 1,
            on: (event: string, callback: (api: any) => void) => {
                // Simplified event system
                if (event === 'select' || event === 'reInit') {
                    callback(api);
                }
            },
            off: (event: string, callback: (api: any) => void) => {
                // Simplified event cleanup
            }
        }), [currentSlide, totalSlides]);

        // Provide the API to parent components if needed
        React.useEffect(() => {
            if (setApi) {
                setApi(api);
            }
        }, [api, setApi]);

        const scrollPrev = React.useCallback(() => {
            api.scrollPrev();
        }, [api]);

        const scrollNext = React.useCallback(() => {
            api.scrollNext();
        }, [api]);

        const handleKeyDown = React.useCallback(
            (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    scrollPrev();
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    scrollNext();
                }
            },
            [scrollPrev, scrollNext]
        );

        const handleBeforeChange = (current: number, next: number) => {
            setCurrentSlide(next);
        };

        return (
            <CarouselContext.Provider
                value={{
                    carouselRef,
                    api,
                    opts,
                    orientation,
                    scrollPrev,
                    scrollNext,
                    canScrollPrev,
                    canScrollNext,
                }}
            >
                <div
                    ref={ref}
                    onKeyDownCapture={handleKeyDown}
                    className={cn('relative', className)}
                    role="region"
                    aria-roledescription="carousel"
                    {...props}
                >
                    {children}
                </div>
            </CarouselContext.Provider>
        );
    }
);
Carousel.displayName = 'Carousel';

const CarouselContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => {
    const {orientation} = useCarousel();
    const antCarouselRef = React.useRef<any>(null);

    // Map orientation to Ant Design's dotPosition
    const dotPosition = orientation === 'horizontal' ? 'bottom' : 'right';

    return (
        <div className="overflow-hidden">
            <AntCarousel
                ref={antCarouselRef}
                dotPosition={dotPosition}
                dots={false}
                className={cn('w-full', className)}
            >
                {React.Children.map(props.children, (child) => (
                    <div className={cn(
                        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
                    )}>
                        {child}
                    </div>
                ))}
            </AntCarousel>
        </div>
    );
});
CarouselContent.displayName = 'CarouselContent';

const CarouselItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            role="group"
            aria-roledescription="slide"
            className={cn(
                'min-w-0 shrink-0 grow-0 basis-full',
                className
            )}
            {...props}
        />
    );
});
CarouselItem.displayName = 'CarouselItem';

const CarouselPrevious = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<typeof Button>
>(({className, variant = 'outline', size = 'icon', ...props}, ref) => {
    const {orientation, scrollPrev, canScrollPrev} = useCarousel();

    return (
        <Button
            ref={ref}
            variant={variant}
            size={size}
            className={cn(
                'absolute h-8 w-8 rounded-full',
                orientation === 'horizontal'
                    ? '-left-12 top-1/2 -translate-y-1/2'
                    : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
                className
            )}
            disabled={!canScrollPrev}
            onClick={scrollPrev}
            {...props}
        >
            <ArrowLeft className="h-4 w-4"/>
            <span className="sr-only">Previous slide</span>
        </Button>
    );
});
CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<typeof Button>
>(({className, variant = 'outline', size = 'icon', ...props}, ref) => {
    const {orientation, scrollNext, canScrollNext} = useCarousel();

    return (
        <Button
            ref={ref}
            variant={variant}
            size={size}
            className={cn(
                'absolute h-8 w-8 rounded-full',
                orientation === 'horizontal'
                    ? '-right-12 top-1/2 -translate-y-1/2'
                    : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
                className
            )}
            disabled={!canScrollNext}
            onClick={scrollNext}
            {...props}
        >
            <ArrowRight className="h-4 w-4"/>
            <span className="sr-only">Next slide</span>
        </Button>
    );
});
CarouselNext.displayName = 'CarouselNext';

export {
    type CarouselApi,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
};
