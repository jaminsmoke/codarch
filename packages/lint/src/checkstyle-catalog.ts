/**
 * Los módulos de Checkstyle que CodArch sabe colocar (ADR 0112).
 *
 * La config XML no dice de qué contenedor cuelga un módulo que no está escrito,
 * y adivinarlo rompería la medida. Este catálogo curado solo incluye módulos
 * frecuentes con su contenedor comprobado; el resto se rechaza y se dice.
 */
export type CheckstyleContainer = "Checker" | "TreeWalker";

const CHECKER: readonly string[] = [
  "FileLength",
  "FileTabCharacter",
  "Header",
  "JavadocPackage",
  "LineLength",
  "NewlineAtEndOfFile",
  "OrderedProperties",
  "RegexpMultiline",
  "RegexpSingleline",
  "SuppressionCommentFilter",
  "SuppressionFilter",
  "SuppressionSingleFilter",
  "SuppressionXpathFilter",
  "UniqueProperties"
];

const TREE_WALKER: readonly string[] = [
  "ArrayTypeStyle",
  "AvoidStarImport",
  "BooleanExpressionComplexity",
  "ClassDataAbstractionCoupling",
  "ClassFanOutComplexity",
  "ConstantName",
  "CyclomaticComplexity",
  "DefaultComesLast",
  "DesignForExtension",
  "EmptyBlock",
  "EmptyCatchBlock",
  "EmptyLineSeparator",
  "EmptyStatement",
  "EqualsHashCode",
  "FallThrough",
  "FinalLocalVariable",
  "FinalParameters",
  "HideUtilityClassConstructor",
  "IllegalCatch",
  "IllegalImport",
  "IllegalInstantiation",
  "IllegalThrows",
  "IllegalToken",
  "IllegalType",
  "ImportOrder",
  "Indentation",
  "InnerTypeLast",
  "InterfaceIsType",
  "JavadocMethod",
  "JavadocStyle",
  "JavadocType",
  "JavadocVariable",
  "LeftCurly",
  "LocalFinalVariableName",
  "LocalVariableName",
  "MagicNumber",
  "MemberName",
  "MethodLength",
  "MethodName",
  "MethodParamPad",
  "MissingCtor",
  "MissingJavadocMethod",
  "MissingJavadocType",
  "MissingSwitchDefault",
  "ModifierOrder",
  "MultipleVariableDeclarations",
  "MutableException",
  "NeedBraces",
  "NoLineWrap",
  "NoWhitespaceAfter",
  "NoWhitespaceBefore",
  "OneStatementPerLine",
  "OneTopLevelClass",
  "OperatorWrap",
  "OuterTypeFilename",
  "PackageName",
  "ParameterName",
  "ParameterNumber",
  "ParenPad",
  "RedundantImport",
  "RedundantModifier",
  "RequireThis",
  "RightCurly",
  "SeparatorWrap",
  "SimplifyBooleanExpression",
  "SimplifyBooleanReturn",
  "StaticVariableName",
  "StringLiteralEquality",
  "SummaryJavadoc",
  "SuperClone",
  "SuperFinalize",
  "ThrowsCount",
  "TypecastParenPad",
  "TypeName",
  "UnnecessaryParentheses",
  "UnusedImports",
  "UpperEll",
  "VisibilityModifier",
  "WhitespaceAfter",
  "WhitespaceAround"
];

const BY_NAME = new Map<string, CheckstyleContainer>();
for (const name of CHECKER) BY_NAME.set(name, "Checker");
for (const name of TREE_WALKER) BY_NAME.set(name, "TreeWalker");

/** El contenedor de un módulo conocido, o `null` si no se puede saber. */
export function checkstyleContainer(name: string): CheckstyleContainer | null {
  return BY_NAME.get(name) ?? null;
}

/** El catálogo para el menú, agrupado por contenedor. */
export function checkstyleGroups(): Array<{ plugin: string; rules: string[] }> {
  return [
    { plugin: "Checker", rules: [...CHECKER].sort() },
    { plugin: "TreeWalker", rules: [...TREE_WALKER].sort() }
  ];
}
