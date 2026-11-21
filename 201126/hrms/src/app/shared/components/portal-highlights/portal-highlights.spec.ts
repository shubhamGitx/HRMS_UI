import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalHighlights } from './portal-highlights';

describe('PortalHighlights', () => {
  let component: PortalHighlights;
  let fixture: ComponentFixture<PortalHighlights>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHighlights],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHighlights);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
