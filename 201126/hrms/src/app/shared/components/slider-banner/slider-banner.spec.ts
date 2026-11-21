import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SliderBanner } from './slider-banner';

describe('SliderBanner', () => {
  let component: SliderBanner;
  let fixture: ComponentFixture<SliderBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SliderBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(SliderBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
