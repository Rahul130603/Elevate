export function CountryFlags({ timezone }) {
  return <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden="true">
    {timezone.countryCodes?.map(code => <img key={code} src={`/flags/${code}.svg`} alt="" className="h-3.5 w-5 object-contain" />)}
  </span>;
}
